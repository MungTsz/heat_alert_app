import { HeatDataProvider, Coordinates } from './types';
import { toHkTimestamp } from '../../utils/hkDate';

// Dev-only stand-in for the API (switched in index.ts, never an automatic
// fallback). A gentle north-south gradient so different places still show
// different values when testing lists and the map pin.
const BASE_TEMPERATURE_C = 31;
const BASE_HUMIDITY_PCT = 78;
const BASE_HEAT_INDEX_C = 37;
const GRADIENT_C_PER_DEGREE_LAT = 20;
const REFERENCE_LAT = 22.3;

const heatIndexFor = ({ latitude }: Coordinates): number =>
  Math.round(
    (BASE_HEAT_INDEX_C +
      (latitude - REFERENCE_LAT) * GRADIENT_C_PER_DEGREE_LAT) *
      10,
  ) / 10;

const delay = () => new Promise<void>(resolve => setTimeout(resolve, 300));

export const mockHeatProvider: HeatDataProvider = {
  getConditionsAt: async coords => {
    await delay();
    return {
      ts: toHkTimestamp(),
      temperatureC: BASE_TEMPERATURE_C,
      relativeHumidityPct: BASE_HUMIDITY_PCT,
      heatIndexC: heatIndexFor(coords),
    };
  },
  getHeatIndexAt: async coords => {
    await delay();
    return heatIndexFor(coords);
  },
};
