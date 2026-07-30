import { useMemo } from 'react';
import { renderIdwBitmap } from '../utils/renderIdwBitmap';
import { WeightedPoint } from '../utils/idw';

type Region = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

export const useIdwOverlayImage = (points: WeightedPoint[], region: Region) => {
  return useMemo(() => renderIdwBitmap(points, region), [points, region]);
};
