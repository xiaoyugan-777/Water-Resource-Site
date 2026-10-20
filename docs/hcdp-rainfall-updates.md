# HCDP monthly rainfall updates

The source is the official HCDP `GET https://api.hcdp.ikewai.org/raster` endpoint with `datatype=rainfall`, `production=new`, `period=month`, and `extent=statewide`. The [official example notebook](https://github.com/HCDP/hcdp_api_notebook/blob/main/workshop.ipynb) contains an older note saying gridded rainfall ended in 2019. HCDP's [current portal](https://www.hawaii.edu/climate-data-portal/) describes near-real-time gridded products, and this repository contains a manually downloaded September 2026 statewide rainfall map. Neither proves the API's exact latest published month; that must be checked with a valid token before deployment. The updater checks completed months newest-first and never fabricates a missing month.

The updater converts an EPSG:4326, north-up GeoTIFF into the website's existing files: `rainfall-values.png` (RGB integer 0 = no data; otherwise `(integer - 1) / 10` mm), `rainfall-overlay.png` (same transparent mask and color ramp), and `rainfall-metadata.json` (period, bounds, unit, status, source, dimensions, valid pixels). It rejects wrong CRS/orientation/bounds, empty or implausible rasters, incompatible PNGs, and mismatched no-data masks. The replacement is staged and backed up locally. It does not alter the map-click code.

The API example does not document a reliable final/preliminary indicator in the raster response. Accordingly, new data is marked **preliminary**, never final by assumption. Confirm final status with HCDP before changing the metadata to final.

## Run manually

In GitHub, add the repository Actions secret `HCDP_API_TOKEN`. Keep the value out of source files and logs. Once this workflow is on the default branch, go to **Actions → Update HCDP monthly rainfall → Run workflow**. Leave `month` empty to check the latest published completed month, or enter `YYYY-MM` to check one month. The workflow runs on the 15th of each month at 18:23 UTC and opens a review pull request only when the validated data changes. It does not merge or deploy.

For local testing: `python -m pip install -r scripts/requirements-hcdp.txt`, set `HCDP_API_TOKEN` privately in your shell, then run `python scripts/update_hcdp_rainfall.py --output-dir /path/to/test-directory`. Do not paste the token into a command, issue, or log. Omit `--output-dir` only when you intend to update the website files locally. A missing token, API failure, invalid raster, or unpublished month leaves the existing assets unchanged.
