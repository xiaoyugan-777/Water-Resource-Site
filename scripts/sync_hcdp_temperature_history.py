"""Archive verified HCDP statewide monthly mean-air-temperature rasters.

The bearer token is read only from HCDP_API_TOKEN. No website asset is changed
until every available candidate in the requested window has passed validation.
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

from update_hcdp_rainfall import months_back, previous_month

API = "https://api.hcdp.ikewai.org/raster"
FILES = ("temperature-values.png", "temperature-overlay.png", "temperature-metadata.json")
ARCHIVE = "temperature-monthly"
INDEX = "temperature-months.json"
OFFSET = 100.0


def fetch_raster(month, token, timeout=120, retries=2):
    params = {"datatype": "temperature", "aggregation": "mean", "period": "month",
              "date": month, "extent": "statewide"}
    request = Request(f"{API}?{urlencode(params)}",
                      headers={"Authorization": f"Bearer {token}", "Accept": "image/tiff"})
    for attempt in range(retries + 1):
        try:
            with urlopen(request, timeout=timeout) as response:
                data = response.read(150_000_001)
                if len(data) > 150_000_000:
                    raise ValueError("HCDP temperature response exceeds 150 MB")
                return data or None
        except HTTPError as error:
            if error.code in (204, 404):
                return None
            if error.code not in (429, 500, 502, 503, 504) or attempt == retries:
                raise RuntimeError(f"HCDP temperature HTTP {error.code} for {month}") from None
        except (URLError, TimeoutError) as error:
            if attempt == retries:
                raise RuntimeError(f"HCDP temperature request failed for {month}: {type(error).__name__}") from None
        import time
        time.sleep(min(2 ** attempt, 4))


def validate_assets(directory):
    directory = Path(directory)
    metadata = json.loads((directory / FILES[2]).read_text())
    if metadata.get("variable") != "monthly mean air temperature" or metadata.get("unit") != "°C":
        raise ValueError("Temperature metadata variable or unit is invalid")
    if not re.fullmatch(r"\d{4}-(0[1-9]|1[0-2])", metadata.get("period", "")):
        raise ValueError("Temperature metadata period is invalid")
    if metadata.get("valueOffset") != OFFSET:
        raise ValueError("Temperature encoding offset is invalid")
    with Image.open(directory / FILES[0]) as values, Image.open(directory / FILES[1]) as overlay:
        if values.mode != "RGB" or overlay.mode != "RGBA":
            raise ValueError("Temperature PNG modes are incompatible")
        size = (metadata["width"], metadata["height"])
        if values.size != size or overlay.size != size:
            raise ValueError("Temperature PNG dimensions do not match metadata")
        pixels = np.asarray(values, dtype=np.uint32)
        encoded = pixels[:, :, 0] * 65536 + pixels[:, :, 1] * 256 + pixels[:, :, 2]
        alpha = np.asarray(overlay.getchannel("A"))
        if int(np.count_nonzero(encoded)) != metadata["validPixels"]:
            raise ValueError("Temperature valid-pixel count is invalid")
        if not np.array_equal(encoded != 0, alpha != 0):
            raise ValueError("Temperature missing-cell masks disagree")
    return metadata


def convert_raster(tiff_bytes, month, output):
    output = Path(output)
    output.mkdir(parents=True, exist_ok=True)
    with rasterio.MemoryFile(tiff_bytes) as memory, memory.open() as dataset:
        if dataset.count < 1 or dataset.crs is None or dataset.crs.to_epsg() != 4326:
            raise ValueError("Expected an EPSG:4326 temperature GeoTIFF")
        transform = dataset.transform
        if not (transform.a > 0 and transform.e < 0 and
                abs(transform.b) < 1e-10 and abs(transform.d) < 1e-10):
            raise ValueError("Temperature raster must be north-up")
        bounds = dataset.bounds
        if not (-161 < bounds.left < -153 and -161 < bounds.right < -153 and
                18 < bounds.bottom < 24 and 18 < bounds.top < 24 and
                bounds.left < bounds.right and bounds.bottom < bounds.top):
            raise ValueError("Temperature raster bounds are not plausible for Hawaiʻi")
        data = dataset.read(1, masked=True).astype(np.float64).filled(np.nan)

    valid = np.isfinite(data)
    if int(valid.sum()) < 1000 or valid.sum() / data.size < 0.01:
        raise ValueError("Too few valid temperature cells")
    if np.any((data[valid] < -50) | (data[valid] > 60)):
        raise ValueError("Temperature values outside plausible °C range; verify source units")
    encoded = np.zeros(data.shape, dtype=np.uint32)
    encoded[valid] = np.rint((data[valid] + OFFSET) * 10).astype(np.uint32) + 1
    rgb = np.stack(((encoded >> 16) & 255, (encoded >> 8) & 255, encoded & 255), axis=-1).astype(np.uint8)
    Image.fromarray(rgb, "RGB").save(output / FILES[0], optimize=True)

    stops = np.array([[48, 89, 145], [84, 153, 185], [204, 223, 205],
                      [248, 199, 112], [218, 121, 71], [154, 61, 54]], dtype=np.float32)
    scaled = np.clip((np.nan_to_num(data, nan=-5) + 5) / 40, 0, 1) * 5
    low = np.clip(np.floor(scaled).astype(np.int32), 0, 4)
    fraction = (scaled - low)[..., None]
    colors = np.clip(stops[low] * (1 - fraction) + stops[low + 1] * fraction, 0, 255).astype(np.uint8)
    Image.fromarray(np.dstack([colors, np.where(valid, 205, 0).astype(np.uint8)]), "RGBA").save(output / FILES[1], optimize=True)
    metadata = {
        "dataset": "HCDP statewide monthly mean air temperature",
        "variable": "monthly mean air temperature", "aggregation": "mean", "period": month,
        "unit": "°C", "status": "not specified by API",
        "source": "Hawaiʻi Climate Data Portal (HCDP), API /raster; temperature/mean/month/statewide",
        "bounds": [[bounds.bottom, bounds.left], [bounds.top, bounds.right]],
        "width": int(data.shape[1]), "height": int(data.shape[0]),
        "valueEncoding": "RGB 24-bit integer, 0 = no data, temperature_C = (integer - 1) / 10 - 100",
        "valueOffset": OFFSET, "validPixels": int(valid.sum()),
        "colorScale": "Visual overlay colors only; sample from temperature-values.png",
        "note": "Monthly mean air temperature, not daily minimum or maximum. Missing cells are not zero.",
    }
    (output / FILES[2]).write_text(json.dumps(metadata, ensure_ascii=False, indent=2) + "\n")
    validate_assets(output)
    return metadata


def sync_history(output, token, count=24, now=None, month=None):
    output = Path(output)
    latest_complete = previous_month(now or datetime.now(ZoneInfo("Pacific/Honolulu")))
    if month and (not re.fullmatch(r"\d{4}-(0[1-9]|1[0-2])", month) or month > latest_complete):
        raise ValueError("Requested temperature month must be a completed YYYY-MM")
    window = [month] if month else list(months_back(latest_complete, count))
    archive = output / ARCHIVE
    with tempfile.TemporaryDirectory(prefix="hcdp-temperature-") as temporary:
        staged = Path(temporary)
        additions = {}
        available = []
        for month in window:
            existing = archive / month
            if existing.exists():
                if validate_assets(existing)["period"] != month:
                    raise ValueError(f"Temperature archive period mismatch: {month}")
            else:
                print(f"Checking HCDP monthly mean temperature {month}")
                tiff = fetch_raster(month, token)
                if tiff is None:
                    continue
                candidate = staged / month
                convert_raster(tiff, month, candidate)
                additions[month] = candidate
            available.append(month)
        if not available:
            raise RuntimeError("No verified HCDP monthly mean-temperature raster is available")
        archive.mkdir(parents=True, exist_ok=True)
        for month, candidate in additions.items():
            destination = archive / month
            if destination.exists():
                raise RuntimeError(f"Temperature archive appeared during update: {month}")
            shutil.move(str(candidate), destination)
        index = {"version": 1, "latest": available[0], "months": available}
        output.mkdir(parents=True, exist_ok=True)
        with tempfile.NamedTemporaryFile(mode="w", dir=output, prefix=".temperature-index-", delete=False) as handle:
            handle.write(json.dumps(index, ensure_ascii=False, indent=2) + "\n")
            staged_index = Path(handle.name)
        os.replace(staged_index, output / INDEX)
        print(f"Temperature archive ready: {len(available)} verified month(s); latest {available[0]}")
        return index


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--months", type=int, default=24)
    parser.add_argument("--month", help="Verify only this completed YYYY-MM month")
    parser.add_argument("--output-dir", type=Path,
                        default=Path(__file__).resolve().parents[1] / "assets/data")
    args = parser.parse_args(argv)
    if not 1 <= args.months <= 120:
        parser.error("--months must be between 1 and 120")
    token = os.environ.get("HCDP_API_TOKEN")
    if not token:
        parser.error("HCDP_API_TOKEN is required")
    sync_history(args.output_dir, token, args.months, month=args.month)


if __name__ == "__main__":
    try:
        main()
    except (ValueError, RuntimeError, rasterio.errors.RasterioError) as error:
        print(f"Temperature archive failed; existing website files retained: {error}", file=sys.stderr)
        sys.exit(1)
