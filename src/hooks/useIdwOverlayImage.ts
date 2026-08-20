// src/hooks/useIdwOverlayImage.ts
import { useMemo } from 'react';
import { renderIdwBitmap } from '../utils/renderIdwBitmap';
import { WeightedPoint } from '../utils/idw';

type Region = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

export const useIdwOverlayImage = (
  points: WeightedPoint[],
  region: Region,
  colorFn: (value: number, alpha: number) => string,
) => {
  return useMemo(
    () => renderIdwBitmap(points, region, colorFn),
    [points, region, colorFn],
  );
};
