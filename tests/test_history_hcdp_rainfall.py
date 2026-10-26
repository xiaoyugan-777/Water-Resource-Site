import importlib.util
import json
import sys
import tempfile
import unittest
from datetime import datetime
from pathlib import Path
from unittest.mock import patch

from test_update_hcdp_rainfall import fixture_raster, updater


SCRIPTS = Path(__file__).resolve().parents[1] / "scripts"
sys.path.insert(0, str(SCRIPTS))
spec = importlib.util.spec_from_file_location("sync_hcdp_rainfall_history", SCRIPTS / "sync_hcdp_rainfall_history.py")
history = importlib.util.module_from_spec(spec)
spec.loader.exec_module(history)


class RainfallHistoryTests(unittest.TestCase):
    def test_archives_months_and_updates_current_compatibility_files(self):
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory)
            updater.convert_raster(fixture_raster(), "2026-09", output)
            with patch.object(history, "fetch_raster", return_value=fixture_raster()) as fetch:
                index = history.sync_history(output, "test-token", 2, datetime(2026, 11, 20))
            self.assertEqual([call.args[0] for call in fetch.call_args_list], ["2026-10"])
            self.assertEqual(index["months"], ["2026-10", "2026-09"])
            self.assertEqual(json.loads((output / history.INDEX).read_text()), index)
            for month in index["months"]:
                self.assertEqual(updater.validate_assets(output / history.ARCHIVE / month)["period"], month)
            self.assertEqual(updater.validate_assets(output)["period"], "2026-10")
            with patch.object(history, "fetch_raster") as fetch_again:
                history.sync_history(output, "test-token", 2, datetime(2026, 11, 20))
            fetch_again.assert_not_called()

    def test_unpublished_month_keeps_current_and_is_omitted(self):
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory)
            updater.convert_raster(fixture_raster(), "2026-09", output)
            with patch.object(history, "fetch_raster", return_value=None):
                index = history.sync_history(output, "test-token", 2, datetime(2026, 11, 20))
            self.assertEqual(index["months"], ["2026-09"])
            self.assertEqual(updater.validate_assets(output)["period"], "2026-09")

    def test_api_failure_changes_no_website_files(self):
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory)
            updater.convert_raster(fixture_raster(), "2026-09", output)
            original = {name: (output / name).read_bytes() for name in updater.FILES}
            with patch.object(history, "fetch_raster", side_effect=RuntimeError("HCDP HTTP 503")):
                with self.assertRaisesRegex(RuntimeError, "503"):
                    history.sync_history(output, "test-token", 2, datetime(2026, 11, 20))
            self.assertEqual(original, {name: (output / name).read_bytes() for name in updater.FILES})
            self.assertFalse((output / history.INDEX).exists())
            self.assertFalse((output / history.ARCHIVE).exists())

    def test_late_api_failure_does_not_publish_earlier_download(self):
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory)
            updater.convert_raster(fixture_raster(), "2026-09", output)
            original = {name: (output / name).read_bytes() for name in updater.FILES}
            with patch.object(history, "fetch_raster", side_effect=[fixture_raster(), RuntimeError("HCDP HTTP 503")]):
                with self.assertRaisesRegex(RuntimeError, "503"):
                    history.sync_history(output, "test-token", 3, datetime(2026, 11, 20))
            self.assertEqual(original, {name: (output / name).read_bytes() for name in updater.FILES})
            self.assertFalse((output / history.INDEX).exists())
            self.assertFalse((output / history.ARCHIVE).exists())


if __name__ == "__main__":
    unittest.main()
