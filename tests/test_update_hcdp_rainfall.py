import importlib.util
import json
import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
from urllib.error import HTTPError, URLError

import numpy as np
import rasterio
from rasterio.io import MemoryFile
from rasterio.transform import from_bounds


SCRIPT = Path(__file__).resolve().parents[1] / "scripts/update_hcdp_rainfall.py"
spec = importlib.util.spec_from_file_location("update_hcdp_rainfall", SCRIPT)
updater = importlib.util.module_from_spec(spec)
spec.loader.exec_module(updater)


def fixture_raster():
    data = np.full((40, 50), 12.34, dtype=np.float32)
    data[0, 0] = -9999
    with MemoryFile() as memory:
        with memory.open(driver="GTiff", width=50, height=40, count=1,
                         dtype="float32", crs="EPSG:4326", nodata=-9999,
                         transform=from_bounds(-159.816, 18.849, -154.668, 22.269, 50, 40)) as dataset:
            dataset.write(data, 1)
        return memory.read()


class RainfallUpdaterTests(unittest.TestCase):
    def test_transient_api_failure_retries_without_exposing_token(self):
        response = unittest.mock.MagicMock()
        response.__enter__.return_value.read.return_value = fixture_raster()
        with patch.object(updater, "urlopen", side_effect=[URLError("private detail"), response]) as open_mock, patch.object(updater.time, "sleep"):
            self.assertEqual(updater.fetch_raster("2026-09", "test-token"), fixture_raster())
        self.assertEqual(open_mock.call_count, 2)

    def test_unpublished_month_is_not_retried(self):
        with patch.object(updater, "urlopen", side_effect=HTTPError("url", 404, "Not Found", {}, None)) as open_mock:
            self.assertIsNone(updater.fetch_raster("2026-09", "test-token"))
        self.assertEqual(open_mock.call_count, 1)

    def test_isolated_verification_requires_published_data(self):
        with tempfile.TemporaryDirectory() as directory:
            with patch.dict(os.environ, {"HCDP_API_TOKEN": "test-token"}), patch.object(updater, "fetch_raster", return_value=None):
                with self.assertRaisesRegex(RuntimeError, "No published raster"):
                    updater.main(["--month", "2026-09", "--require-data", "--output-dir", directory])
            self.assertEqual(list(Path(directory).iterdir()), [])

    def test_conversion_preserves_encoding_bounds_and_missing_cells(self):
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory)
            metadata = updater.convert_raster(fixture_raster(), "2026-09", output)
            self.assertEqual(metadata["period"], "2026-09")
            self.assertEqual(metadata["unit"], "mm")
            self.assertEqual(metadata["status"], "preliminary")
            self.assertEqual(metadata["validPixels"], 1999)
            self.assertEqual(metadata["bounds"], [[18.849, -159.816], [22.269, -154.668]])
            self.assertEqual(updater.validate_assets(output)["validPixels"], 1999)
            from PIL import Image
            pixels = np.asarray(Image.open(output / "rainfall-values.png"))
            self.assertEqual(tuple(pixels[0, 0]), (0, 0, 0))
            encoded = int(pixels[1, 1, 0]) * 65536 + int(pixels[1, 1, 1]) * 256 + int(pixels[1, 1, 2])
            self.assertEqual((encoded - 1) / 10, 12.3)

    def test_missing_month_keeps_existing_assets(self):
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory)
            updater.convert_raster(fixture_raster(), "2026-08", output)
            original = {name: (output / name).read_bytes() for name in updater.FILES}
            with patch.dict(os.environ, {"HCDP_API_TOKEN": "test-token"}), patch.object(updater, "fetch_raster", return_value=None):
                self.assertEqual(updater.main(["--month", "2026-09", "--output-dir", directory]), 0)
            self.assertEqual(original, {name: (output / name).read_bytes() for name in updater.FILES})

    def test_invalid_candidate_keeps_existing_assets(self):
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory)
            updater.convert_raster(fixture_raster(), "2026-08", output)
            original = {name: (output / name).read_bytes() for name in updater.FILES}
            with patch.dict(os.environ, {"HCDP_API_TOKEN": "test-token"}), patch.object(updater, "fetch_raster", return_value=b"not a GeoTIFF"):
                with self.assertRaises(rasterio.errors.RasterioError):
                    updater.main(["--month", "2026-09", "--output-dir", directory])
            self.assertEqual(original, {name: (output / name).read_bytes() for name in updater.FILES})


if __name__ == "__main__":
    unittest.main()
