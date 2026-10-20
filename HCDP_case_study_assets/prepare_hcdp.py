"""Convert an HCDP monthly rainfall ZIP to Leaflet overlay and lossless-ish sampling raster.
Usage: python prepare_hcdp.py HCDP_data.zip output_directory
Requires rasterio, numpy, pillow.
"""
import io, json, sys, zipfile
from pathlib import Path
import numpy as np
from PIL import Image
import rasterio

zip_path, out_dir = Path(sys.argv[1]), Path(sys.argv[2]); out_dir.mkdir(parents=True,exist_ok=True)
with zipfile.ZipFile(zip_path) as z:
    tif_names=[n for n in z.namelist() if n.lower().endswith(('.tif','.tiff')) and '/data_map/' in n]
    if len(tif_names)!=1: raise ValueError(f'Expected one rainfall data_map TIFF, found {tif_names}')
    with rasterio.MemoryFile(z.read(tif_names[0])) as mem:
        with mem.open() as ds:
            if ds.crs.to_epsg()!=4326: raise ValueError('Expected EPSG:4326; reproject before using')
            data=ds.read(1,masked=True).filled(np.nan).astype('float32')
            bounds=ds.bounds
    valid=np.isfinite(data) & (data>=0)
    # 0 is reserved for NoData; valid rainfall encoded as round(mm*10)+1.
    quant=np.zeros(data.shape,dtype=np.uint32)
    quant[valid]=np.rint(data[valid]*10).astype(np.uint32)+1
    if quant.max()>0xFFFFFF: raise ValueError('Value exceeds 24-bit RGB range')
    rgb=np.stack(((quant>>16)&255,(quant>>8)&255,quant&255),axis=-1).astype(np.uint8)
    Image.fromarray(rgb,'RGB').save(out_dir/'rainfall-values.png',optimize=True)
    # Blue-yellow-red sequential ramp; fully transparent outside valid data.
    stops=np.array([[248,250,252],[179,221,235],[68,166,196],[34,96,151],[252,187,89],[188,56,50]],dtype=np.float32)
    scale=np.clip(data/1000,0,1)*5
    lo=np.clip(np.floor(np.nan_to_num(scale)).astype(np.int32),0,4)
    frac=(np.nan_to_num(scale)-lo)[...,None]
    col=np.clip(stops[lo]*(1-frac)+stops[lo+1]*frac,0,255).astype(np.uint8)
    rgba=np.dstack([col,np.where(valid,205,0).astype(np.uint8)])
    Image.fromarray(rgba,'RGBA').save(out_dir/'rainfall-overlay.png',optimize=True)
    metadata={
      'dataset':'HCDP statewide monthly rainfall','period':'2026-09','unit':'mm','status':'preliminary',
      'source':'Hawaiʻi Climate Data Portal (HCDP)',
      'bounds':[[bounds.bottom,bounds.left],[bounds.top,bounds.right]],
      'width':int(data.shape[1]),'height':int(data.shape[0]),
      'valueEncoding':'RGB 24-bit integer, 0 = no data, rainfall_mm = (integer - 1) / 10',
      'colorScale':'Visual overlay colors only; sample from rainfall-values.png',
      'validPixels':int(valid.sum()),
      'note':'Monthly cumulative rainfall estimate, not realtime rainfall. Schematic site coordinates must not be interpreted as measured locations.'
    }
    (out_dir/'rainfall-metadata.json').write_text(json.dumps(metadata,ensure_ascii=False,indent=2))
    print('Created:',*(str(p) for p in out_dir.iterdir()),sep='\n')
