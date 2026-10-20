(() => {
  "use strict";

  const decodeRGB = (red, green, blue) => {
    const encoded = red * 65536 + green * 256 + blue;
    return encoded === 0 ? null : (encoded - 1) / 10;
  };

  const coordinateToPixel = (lat, lng, metadata) => {
    const [[south, west], [north, east]] = metadata.bounds;
    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lng) ||
      lat < south ||
      lat > north ||
      lng < west ||
      lng > east
    ) {
      return null;
    }

    // The raster's first row is the northern edge. Clamp points exactly on
    // the south/east bounds to the final pixel instead of overflowing.
    const x = Math.min(
      metadata.width - 1,
      Math.floor(((lng - west) / (east - west)) * metadata.width),
    );
    const y = Math.min(
      metadata.height - 1,
      Math.floor(((north - lat) / (north - south)) * metadata.height),
    );
    return { x, y };
  };

  function createRainfallQuery({ metadataURL, rasterURL }) {
    let metadataPromise;
    let rasterPromise;

    const getMetadata = () => {
      if (!metadataPromise) {
        metadataPromise = fetch(metadataURL).then((response) => {
          if (!response.ok) throw new Error("Unable to load rainfall metadata");
          return response.json();
        }).then((metadata) => {
          const hasValidBounds =
            Array.isArray(metadata.bounds) &&
            metadata.bounds.length === 2 &&
            metadata.bounds.every((corner) =>
              Array.isArray(corner) && corner.length === 2 && corner.every(Number.isFinite));
          if (!hasValidBounds || !Number.isInteger(metadata.width) || !Number.isInteger(metadata.height)) {
            throw new Error("Rainfall metadata is invalid");
          }
          return metadata;
        });
      }
      return metadataPromise;
    };

    const loadRaster = () => {
      if (!rasterPromise) {
        rasterPromise = Promise.all([
          getMetadata(),
          fetch(rasterURL).then((response) => {
            if (!response.ok) throw new Error("Unable to load rainfall raster");
            return response.blob();
          }),
        ]).then(async ([metadata, blob]) => {
          let bitmap;
          try {
            // Disabling color-space conversion is essential because RGB stores
            // data values here, not display colors.
            bitmap = await createImageBitmap(blob, {
              colorSpaceConversion: "none",
              premultiplyAlpha: "none",
            });
          } catch (caught) {
            throw new Error("This browser cannot decode the rainfall raster without color conversion", {
              cause: caught,
            });
          }

          if (bitmap.width !== metadata.width || bitmap.height !== metadata.height) {
            bitmap.close?.();
            throw new Error("Rainfall raster dimensions do not match its metadata");
          }

          const canvas = document.createElement("canvas");
          canvas.width = metadata.width;
          canvas.height = metadata.height;
          const context = canvas.getContext("2d", { willReadFrequently: true });
          if (!context) {
            bitmap.close?.();
            throw new Error("Unable to create a canvas for rainfall queries");
          }
          context.imageSmoothingEnabled = false;
          context.drawImage(bitmap, 0, 0);
          bitmap.close?.();

          // Read once and retain the byte array so clicks never fetch or decode
          // the full PNG again.
          return {
            metadata,
            pixels: context.getImageData(0, 0, metadata.width, metadata.height).data,
          };
        });
      }
      return rasterPromise;
    };

    const getRainfallAt = async (lat, lng) => {
      try {
        const metadata = await getMetadata();
        const pixel = coordinateToPixel(Number(lat), Number(lng), metadata);
        if (!pixel) return { status: "out-of-bounds", value: null, metadata };

        const raster = await loadRaster();
        const offset = (pixel.y * metadata.width + pixel.x) * 4;
        const value = decodeRGB(
          raster.pixels[offset],
          raster.pixels[offset + 1],
          raster.pixels[offset + 2],
        );
        return {
          status: value === null ? "no-data" : "ok",
          value,
          pixel,
          metadata,
        };
      } catch (error) {
        return { status: "error", value: null, error };
      }
    };

    // Expose the already decoded, validated raster for the climate map. The
    // returned pixels retain the same lossless encoding used for point lookup.
    return Object.freeze({ getMetadata, getRainfallAt, getRaster: loadRaster });
  }

  window.HCDPRainfall = Object.freeze({
    createRainfallQuery,
    coordinateToPixel,
    decodeRGB,
  });
})();
