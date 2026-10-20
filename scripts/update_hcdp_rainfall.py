"""Fetch and validate the newest published HCDP statewide monthly rainfall raster.

Requires: rasterio, numpy, Pillow. HCDP_API_TOKEN is read only from the environment.
The three website assets are replaced only after the candidate raster and PNGs pass
validation. A missing/unpublished month is a no-op.
"""

import argparse
import json
import os
import re
import shutil
import sys
import tempfile
from datetime import datetime
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen
from zoneinfo import ZoneInfo

import numpy as np
import rasterio
from PIL import Image

API = "https://api.hcdp.ikewai.org/raster"
FILES = ("rainfall-values.png", "rainfall-overlay.png", "rainfall-metadata.json")
ENCODING = "RGB 24-bit integer, 0 = no data, rainfall_mm = (integer - 1) / 10"


def previous_month(now):
    year, month = now.year, now.month - 1
    return f"{year - 1:04d}-12" if month == 0 else f"{year:04d}-{month:02d}"


def months_back(start, count):
    year, month = map(int, start.split("-"))
    for _ in range(count):
        yield f"{year:04d}-{month:02d}"
        month -= 1
        if month == 0:
            year, month = year - 1, 12


def fetch_raster(month, token, timeout=90):
    params = {"datatype": "rainfall", "production": "new", "period": "month",
              "date": month, "extent": "statewide"}
    request = Request(f"{API}?{urlencode(params)}",
                      headers={"Authorization": f"Bearer {token}", "Accept": "image/tiff"})
    try:
        with urlopen(request, timeout=timeout) as response:
            data = response.read(150_000_001)
            if len(data) > 150_000_000:
                raise ValueError("HCDP response exceeds 150 MB")
            if not data:
                return None
            return data
    except HTTPError as error:
        if error.code in (204, 404):
            return None
        raise RuntimeError(f"HCDP HTTP {error.code} for {month}") from None
    except URLError as error:
        raise RuntimeError(f"HCDP request failed for {month}: {error.reason}") from None


def convert_raster(tiff_bytes, month, output):
    with rasterio.MemoryFile(tiff_bytes) as memory, memory.open() as dataset:
        if dataset.count < 1 or dataset.crs is None or dataset.crs.to_epsg() != 4326:
            raise ValueError("Expected a georeferenced EPSG:4326 GeoTIFF")
        transform = dataset.transform
        if not (transform.a > 0 and transform.e < 0 and
                abs(transform.b) < 1e-10 and abs(transform.d) < 1e-10):
            raise ValueError("Raster must be north-up without rotation")
        bounds = dataset.bounds
        if not (-161 < bounds.left < -153 and -161 < bounds.right < -153 and
                18 < bounds.bottom < 24 and 18 < bounds.top < 24 and
                bounds.left < bounds.right and bounds.bottom < bounds.top):
            raise ValueError("Raster bounds do not cover a plausible Hawaiʻi extent")
        data = dataset.read(1, masked=True).astype(np.float64).filled(np.nan)

    valid = np.isfinite(data) & (data >= 0)
    valid_count = int(valid.sum())
    if valid_count < 1000 or valid_count / data.size < 0.01:
        raise ValueError("Too few valid rainfall cells")
    if np.any(data[valid] > 100_000):
        raise ValueError("Rainfall exceeds the supported 24-bit encoding")
    encoded = np.zeros(data.shape, dtype=np.uint32)
    encoded[valid] = np.rint(data[valid] * 10).astype(np.uint32) + 1
    if encoded.max() > 0xFFFFFF:
        raise ValueError("Rainfall exceeds the 24-bit PNG range")
    rgb = np.stack(((encoded >> 16) & 255, (encoded >> 8) & 255, encoded & 255), axis=-1).astype(np.uint8)
    Image.fromarray(rgb, "RGB").save(output / FILES[0], optimize=True)

    stops = np.array([[248, 250, 252], [179, 221, 235], [68, 166, 196],
                      [34, 96, 151], [252, 187, 89], [188, 56, 50]], dtype=np.float32)
    scale = np.clip(np.nan_to_num(data, nan=0) / 1000, 0, 1) * 5
    low = np.clip(np.floor(scale).astype(np.int32), 0, 4)
    fraction = (scale - low)[..., None]
    colors = np.clip(stops[low] * (1 - fraction) + stops[low + 1] * fraction, 0, 255).astype(np.uint8)
    rgba = np.dstack([colors, np.where(valid, 205, 0).astype(np.uint8)])
    Image.fromarray(rgba, "RGBA").save(output / FILES[1], optimize=True)

    metadata = {
        "dataset": "HCDP statewide monthly rainfall", "period": month,
        "unit": "mm", "status": "preliminary",
        "source": "Hawaiʻi Climate Data Portal (HCDP), API /raster; rainfall/new/month/statewide",
        "bounds": [[bounds.bottom, bounds.left], [bounds.top, bounds.right]],
        "width": int(data.shape[1]), "height": int(data.shape[0]),
        "valueEncoding": ENCODING,
        "colorScale": "Visual overlay colors only; sample from rainfall-values.png",
        "validPixels": valid_count,
        "note": "Monthly cumulative rainfall estimate, not realtime rainfall. Preliminary until HCDP confirms final status. Schematic site coordinates must not be interpreted as measured locations.",
    }
    (output / FILES[2]).write_text(json.dumps(metadata, ensure_ascii=False, indent=2) + "\n")
    validate_assets(output)
    return metadata


def validate_assets(directory):
    metadata = json.loads((directory / FILES[2]).read_text())
    with Image.open(directory / FILES[0]) as values, Image.open(directory / FILES[1]) as overlay:
        if values.mode != "RGB" or overlay.mode != "RGBA":
            raise ValueError("Rainfall PNG modes are incompatible with the website")
        size = (metadata["width"], metadata["height"])
        if values.size != size or overlay.size != size:
            raise ValueError("PNG dimensions do not match metadata")
        pixels = np.asarray(values, dtype=np.uint32)
        decoded = pixels[:, :, 0] * 65536 + pixels[:, :, 1] * 256 + pixels[:, :, 2]
        alpha = np.asarray(overlay.getchannel("A"))
        if int(np.count_nonzero(decoded)) != metadata["validPixels"]:
            raise ValueError("Valid pixel count does not match metadata")
        if not np.array_equal(decoded != 0, alpha != 0):
            raise ValueError("Overlay and value raster disagree on missing cells")
    return metadata


def install_assets(staged, output):
    output.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(dir=output, prefix=".rainfall-backup-") as backup_name:
        backup = Path(backup_name)
        for name in FILES:
            if (output / name).exists():
                shutil.copy2(output / name, backup / name)
        installed = []
        try:
            # Metadata is last so the browser never sees a new period before both PNGs exist.
            for name in FILES:
                os.replace(staged / name, output / name)
                installed.append(name)
            validate_assets(output)
        except Exception:
            for name in reversed(installed):
                if (backup / name).exists():
                    os.replace(backup / name, output / name)
                else:
                    (output / name).unlink(missing_ok=True)
            raise


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--month", help="Try only this published YYYY-MM month")
    parser.add_argument("--lookback", type=int, default=24, help="Months to probe (default: 24)")
    parser.add_argument("--output-dir", type=Path,
                        default=Path(__file__).resolve().parents[1] / "assets/data")
    args = parser.parse_args(argv)
    if args.month and not re.fullmatch(r"\d{4}-(0[1-9]|1[0-2])", args.month):
        parser.error("--month must be YYYY-MM")
    if not 1 <= args.lookback <= 120:
        parser.error("--lookback must be between 1 and 120")
    token = os.environ.get("HCDP_API_TOKEN")
    if not token:
        parser.error("HCDP_API_TOKEN is required; no files were changed")
    existing_path = args.output_dir / FILES[2]
    existing_period = json.loads(existing_path.read_text()).get("period") if existing_path.exists() else None
    latest_complete = previous_month(datetime.now(ZoneInfo("Pacific/Honolulu")))
    months = [args.month] if args.month else list(months_back(latest_complete, args.lookback))
    for month in months:
        if month > latest_complete:
            raise ValueError(f"{month} is not a completed month")
        if existing_period and month <= existing_period:
            break
        print(f"Checking HCDP rainfall {month}")
        tiff = fetch_raster(month, token)
        if tiff is None:
            continue
        with tempfile.TemporaryDirectory(prefix="hcdp-rainfall-") as tmp:
            staged = Path(tmp)
            metadata = convert_raster(tiff, month, staged)
            install_assets(staged, args.output_dir)
        print(f"Updated rainfall to {month}: {metadata['validPixels']} valid cells")
        return 0
    print("No newer published, valid monthly raster; existing files retained")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except (ValueError, RuntimeError, rasterio.errors.RasterioError) as error:
        print(f"Rainfall update failed; existing files retained: {error}", file=sys.stderr)
        sys.exit(1)
