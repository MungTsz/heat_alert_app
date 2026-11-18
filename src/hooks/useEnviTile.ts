// src/hooks/useEnviTile.ts
import { Region } from 'react-native-maps';
import { ENVI_MAP_SOURCE } from '../config/mapLayerConfig';
import { isPraiseConfigured } from '../config/praiseConfig';
import { MapTile } from '../types/mapSettings';
import { enviTileSource } from '../utils/enviMapLayer';
import { usePraiseAqhiTile } from './usePraiseAqhiTile';

// Environmental Index counterpart of useHeatIndexTile / usePraiseAqhiTile —
// same arguments, same { tile, loading } result — so MapScreen draws all
// three layers through the same Overlay code.
//
// While ENVI_MAP_SOURCE is 'aqhi-demo' the picture is the AQHI tile (none
// without PRAISE). Once a real index tile exists, ENVI_MAP_SOURCE becomes
// 'tile' and only this hook changes: add `fetchEnviTile(ts, bounds):
// Promise<MapTile | null>` to a services/enviTileApi.ts and fetch it here
// the way useHeatIndexTile does. Until then 'tile' returns no tile — never a
// made-up one.
export const useEnviTile = (
  region: Region,
  active: boolean,
): { tile: MapTile | null; loading: boolean } => {
  const source = enviTileSource(ENVI_MAP_SOURCE, isPraiseConfigured());
  // Always called (rules of hooks); only fetches while borrowing AQHI.
  const borrowed = usePraiseAqhiTile(region, active && source === 'aqhi');
  if (source === 'aqhi') return borrowed;
  // 'tile': the index tile service isn't built yet (see above). null: no
  // AQHI to borrow, so no picture.
  return { tile: null, loading: false };
};
