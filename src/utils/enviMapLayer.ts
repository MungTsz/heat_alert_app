// src/utils/enviMapLayer.ts
// Pure rules behind the Environmental Index map layer, kept out of the
// hooks and components so they can be tested without rendering.
import { EnviMapSource } from '../config/mapLayerConfig';
import { ENVI_LEVELS } from '../config/enviConfig';
import { getEnviLevel } from './enviUtils';
import { hexToRgba } from './color';

// Where the index layer's current picture comes from:
// - 'aqhi': the demo borrows the AQHI tile (and, while that loads, the AQHI
//   IDW fallback) — nothing when PRAISE isn't configured, as there is no
//   AQHI to borrow;
// - 'tile': the real index tile service (not built yet).
export const enviTileSource = (
  source: EnviMapSource,
  praiseConfigured: boolean,
): 'aqhi' | 'tile' | null => {
  if (source === 'tile') return 'tile';
  return praiseConfigured ? 'aqhi' : null;
};

// Whether the index layer can have Play Forecast frames at all. Never in
// the demo: the borrowed AQHI forecast is not an index forecast. With a
// real index tile, yes — heat and AQHI both have real forecasts.
export const enviForecastSupported = (source: EnviMapSource): boolean =>
  source === 'tile';

// A saved place's (or tapped point's) index level on the map: the same
// getEnviLevel as Home's card, so a pin never disagrees with it. One missing
// reading → the other hazard's level; both missing → null ("--").
export const pinEnviLevel = (values: {
  heatIndex: number | null;
  aqhi: number | null;
}): number | null => getEnviLevel({ heat: values.heatIndex, aqhi: values.aqhi });

export type EnviLegendEntry = {
  level: number;
  name: string;
  // The level colour at the layer's opacity, as it looks on the map.
  swatchColor: string;
};

// The index legend's rows, worst first (as HeatLegend / AqhiLegend), read
// from ENVI_LEVELS so the legend can never drift from the square and band.
export const enviMapLegendEntries = (opacity: number): EnviLegendEntry[] =>
  [...ENVI_LEVELS].reverse().map(({ level, name, color }) => ({
    level,
    name,
    swatchColor: hexToRgba(color, opacity),
  }));
