// src/hooks/useDefaultMapLayer.ts
import { useEffect, useState } from 'react';
import { MapLayer } from '../types/mapSettings';
import { pickDefaultMapLayer } from '../utils/defaultMapLayer';

// The layer state of one map that opens and closes (the full-screen map, a
// saved place's map): it starts on the Environmental Index and goes back to
// it every time the map closes, so each opening starts on the index again
// even if the user last looked at a detail layer. Reset on close rather
// than on open, so the map never shows the old layer for a frame.
export const useDefaultMapLayer = (open: boolean) => {
  const [layer, setLayer] = useState<MapLayer>(pickDefaultMapLayer);
  useEffect(() => {
    if (!open) setLayer(pickDefaultMapLayer());
  }, [open]);
  return [layer, setLayer] as const;
};
