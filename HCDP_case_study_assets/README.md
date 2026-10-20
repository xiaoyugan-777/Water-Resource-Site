# HCDP September 2026 rainfall map assets

These files were generated from the user's manually downloaded HCDP statewide September 2026 monthly rainfall ZIP.

- `assets/rainfall-overlay.png`: georeferenced PNG for `L.imageOverlay(url, metadata.bounds)`.
- `assets/rainfall-values.png`: raster values, RGB 24-bit encoding. Integer `0` means no data, otherwise `(integer - 1) / 10` is rainfall in millimeters.
- `assets/rainfall-metadata.json`: bounds, date, unit, and decoding instructions.
- `prepare_hcdp.py`: repeatable conversion script, suitable for manual download today or API ingestion later.

Example overlay:
```js
const meta = await fetch('../assets/data/hcdp/rainfall-metadata.json').then(r => r.json());
const layer = L.imageOverlay('../assets/data/hcdp/rainfall-overlay.png', meta.bounds, {opacity:0.7});
layer.addTo(map);
```

For a site at `lat,lng`, convert to raster pixel coordinates:
```
x = Math.floor((lng - bounds[0][1]) / (bounds[1][1] - bounds[0][1]) * width);
y = Math.floor((bounds[1][0] - lat) / (bounds[1][0] - bounds[0][0]) * height);
```
Read `rainfall-values.png` via a canvas using `getImageData(x,y,1,1)`; decode `n=(r<<16)|(g<<8)|b`, `n===0` is NoData, else `(n-1)/10` mm. Use original site coordinates only, not schematic placements.

These are *prepared data assets*, not a deployed website change. The overlay must still be wired into the live Case Study Explorer code and tested. HCDP product is preliminary and subject to revision.
