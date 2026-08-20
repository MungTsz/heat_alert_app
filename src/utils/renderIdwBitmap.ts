// src/utils/renderIdwBitmap.ts
import { Skia, TileMode } from '@shopify/react-native-skia';
import { idwInterpolate, WeightedPoint } from './idw';

type Region = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

// colorFn lets any hazard (heat, AQHI, future ones) reuse this same renderer
// — it just needs to map a numeric value to an rgba() string.
export const renderIdwBitmap = (
  points: WeightedPoint[],
  region: Region,
  colorFn: (value: number, alpha: number) => string,
  gridResolution: number = 45,
  canvasSize: number = 360,
  blurSigma: number = 3,
): string | null => {
  if (points.length === 0) return null;

  const surface = Skia.Surface.Make(canvasSize, canvasSize);
  if (!surface) return null;
  const canvas = surface.getCanvas();

  const minLat = region.latitude - Math.abs(region.latitudeDelta) / 2;
  const maxLat = region.latitude + Math.abs(region.latitudeDelta) / 2;
  const minLng = region.longitude - Math.abs(region.longitudeDelta) / 2;
  const maxLng = region.longitude + Math.abs(region.longitudeDelta) / 2;

  const cellPixels = canvasSize / gridResolution;

  const blurFilter = Skia.ImageFilter.MakeBlur(
    blurSigma,
    blurSigma,
    TileMode.Decal,
    null,
  );
  const layerPaint = Skia.Paint();
  layerPaint.setImageFilter(blurFilter);
  canvas.saveLayer(layerPaint);

  for (let i = 0; i < gridResolution; i++) {
    for (let j = 0; j < gridResolution; j++) {
      const lat = maxLat - (i / gridResolution) * (maxLat - minLat);
      const lng = minLng + (j / gridResolution) * (maxLng - minLng);
      const value = idwInterpolate(lat, lng, points);
      const color = colorFn(value, 0.9);

      const cellPaint = Skia.Paint();
      cellPaint.setColor(Skia.Color(color));
      canvas.drawRect(
        {
          x: j * cellPixels,
          y: i * cellPixels,
          width: cellPixels + 1,
          height: cellPixels + 1,
        },
        cellPaint,
      );
    }
  }

  canvas.restore();

  const image = surface.makeImageSnapshot();
  const base64 = image.encodeToBase64();
  return `data:image/png;base64,${base64}`;
};
