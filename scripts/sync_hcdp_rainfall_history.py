"""Archive the last 24 available HCDP monthly rasters for the static map.

The token is read from HCDP_API_TOKEN. All missing months are downloaded and
validated before any website files change. Unpublished months are omitted.
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
from zoneinfo import ZoneInfo

import rasterio

from update_hcdp_rainfall import (
    FILES, convert_raster, fetch_raster, install_assets, months_back,
    previous_month, validate_assets,
)

INDEX = "rainfall-months.json"
ARCHIVE = "rainfall-monthly"


def sync_history(output, token, count=24, now=None):
    output = Path(output)
    output.mkdir(parents=True, exist_ok=True)
    latest_complete = previous_month(now or datetime.now(ZoneInfo("Pacific/Honolulu")))
    window = list(months_back(latest_complete, count))
    archive = output / ARCHIVE
    current_file = output / FILES[2]
    current = validate_assets(output) if current_file.exists() else None
    current_period = current["period"] if current else None
    if current_period and (not re.fullmatch(r"\d{4}-(0[1-9]|1[0-2])", current_period)
                           or current_period > latest_complete):
        raise ValueError("Current rainfall metadata has an invalid or future period")

    with tempfile.TemporaryDirectory(prefix="hcdp-history-") as temporary:
        staged = Path(temporary)
        additions = {}
        available = []
        for month in window:
            existing = archive / month
            if existing.exists():
                metadata = validate_assets(existing)
                if metadata["period"] != month:
                    raise ValueError(f"Archived rainfall period mismatch: {month}")
            elif month == current_period:
                candidate = staged / month
                candidate.mkdir()
                for name in FILES:
                    shutil.copy2(output / name, candidate / name)
                additions[month] = candidate
            else:
                print(f"Checking HCDP rainfall {month}")
                tiff = fetch_raster(month, token)
                if tiff is None:
                    continue
                candidate = staged / month
                candidate.mkdir()
                convert_raster(tiff, month, candidate)
                additions[month] = candidate
            available.append(month)

        if not available:
            raise RuntimeError("No validated monthly rainfall raster is available")
        archive.mkdir(exist_ok=True)
        for month, candidate in additions.items():
            destination = archive / month
            if destination.exists():
                raise RuntimeError(f"Archive appeared during update: {month}")
            shutil.move(str(candidate), destination)

        newest = available[0]
        if current_period is None or newest > current_period:
            with tempfile.TemporaryDirectory(prefix="hcdp-current-") as current_tmp:
                current_stage = Path(current_tmp)
                for name in FILES:
                    shutil.copy2(archive / newest / name, current_stage / name)
                install_assets(current_stage, output)

        index = {"version": 1, "latest": newest, "months": available}
        index_path = output / INDEX
        contents = json.dumps(index, ensure_ascii=False, indent=2) + "\n"
        if not index_path.exists() or index_path.read_text() != contents:
            with tempfile.NamedTemporaryFile(mode="w", dir=output, prefix=".rainfall-index-",
                                             delete=False) as temporary_index:
                temporary_index.write(contents)
                staged_index = Path(temporary_index.name)
            os.replace(staged_index, index_path)
        print(f"Rainfall archive ready: {len(available)} verified month{'s' if len(available) != 1 else ''}; latest {newest}")
        return index


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--months", type=int, default=24, help="Completed months to check (default: 24)")
    parser.add_argument("--output-dir", type=Path,
                        default=Path(__file__).resolve().parents[1] / "assets/data")
    args = parser.parse_args(argv)
    if not 1 <= args.months <= 120:
        parser.error("--months must be between 1 and 120")
    token = os.environ.get("HCDP_API_TOKEN")
    if not token:
        parser.error("HCDP_API_TOKEN is required; no files were changed")
    sync_history(args.output_dir, token, args.months)


if __name__ == "__main__":
    try:
        main()
    except (ValueError, RuntimeError, rasterio.errors.RasterioError) as error:
        print(f"Rainfall archive failed; current website files retained: {error}", file=sys.stderr)
        sys.exit(1)
