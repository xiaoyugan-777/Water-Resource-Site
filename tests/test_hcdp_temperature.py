import json
import socket
import sys
import tempfile
import unittest
from datetime import datetime
from pathlib import Path
from unittest.mock import patch
from urllib.error import URLError

import numpy as np
import rasterio
from PIL import Image
from rasterio.io import MemoryFile
from rasterio.transform import from_bounds

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
import sync_hcdp_temperature_history as temperature


def fixture_tiff():
    values = np.full((100, 100), 22.4, dtype=np.float32)
    values[0, 0] = -2.5
    values[0, 1] = 0.0
    values[0, 2] = -9999.0
    with MemoryFile() as memory:
        with memory.open(driver="GTiff", height=100, width=100, count=1,
                         dtype="float32", crs="EPSG:4326", nodata=-9999.0,
                         transform=from_bounds(-159.8, 18.8, -154.7, 22.3, 100, 100)) as raster:
            raster.write(values, 1)
        return memory.read()


class TemperatureTests(unittest.TestCase):
    def test_network_errors_are_classified_without_leaking_details(self):
        self.assertEqual(temperature.network_error_category(URLError(socket.timeout("private detail"))), "timeout")
        self.assertEqual(temperature.network_error_category(URLError(socket.gaierror(-2, "private detail"))), "DNS resolution failure")

    def test_conversion_preserves_negative_zero_missing_and_metadata(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            metadata = temperature.convert_raster(fixture_tiff(), "2026-09", root)
            self.assertEqual(metadata["aggregation"], "mean")
            self.assertEqual(metadata["unit"], "°C")
            self.assertEqual(metadata["status"], "not specified by API")
            temperature.validate_assets(root)
            with Image.open(root / temperature.FILES[0]) as image:
                rgb = np.asarray(image, dtype=np.uint32)
            encoded = rgb[:, :, 0] * 65536 + rgb[:, :, 1] * 256 + rgb[:, :, 2]
            self.assertAlmostEqual((encoded[0, 0] - 1) / 10 - 100, -2.5)
            self.assertAlmostEqual((encoded[0, 1] - 1) / 10 - 100, 0.0)
            self.assertEqual(encoded[0, 2], 0)

    def test_archive_only_publishes_valid_months(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            with patch.object(temperature, "fetch_raster", side_effect=lambda month, token: fixture_tiff() if month == "2026-09" else None):
                index = temperature.sync_history(root, "private-token", 2,
                    now=datetime(2026, 10, 26))
            self.assertEqual(index["months"], ["2026-09"])
            self.assertEqual(json.loads((root / temperature.INDEX).read_text()), index)
            self.assertEqual(temperature.validate_assets(root / temperature.ARCHIVE / "2026-09")["period"], "2026-09")

    def test_api_failure_does_not_replace_existing_index(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / temperature.INDEX).write_text("original")
            with patch.object(temperature, "fetch_raster", side_effect=RuntimeError("HCDP temperature HTTP 503 for 2026-09")):
                with self.assertRaises(RuntimeError):
                    temperature.sync_history(root, "private-token", 1, now=datetime(2026, 10, 26))
            self.assertEqual((root / temperature.INDEX).read_text(), "original")

    def test_rejects_wrong_units(self):
        with tempfile.TemporaryDirectory() as directory:
            with MemoryFile(fixture_tiff()) as memory, memory.open() as source:
                values = source.read(1)
            values[:] = 273.15
            with MemoryFile() as memory:
                with memory.open(driver="GTiff", height=100, width=100, count=1,
                                 dtype="float32", crs="EPSG:4326",
                                 transform=from_bounds(-159.8, 18.8, -154.7, 22.3, 100, 100)) as raster:
                    raster.write(values, 1)
                with self.assertRaisesRegex(ValueError, "source units"):
                    temperature.convert_raster(memory.read(), "2026-09", directory)


if __name__ == "__main__":
    unittest.main()
