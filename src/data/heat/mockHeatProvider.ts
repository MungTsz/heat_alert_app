import { HeatDataProvider, HeatPoint, Coordinates } from './types';

// Fixed anchor points spread across a wide area, with deliberately varied temperatures.
// This mirrors real heat-index behavior: distinct microclimates (urban core, waterfront,
// green space, etc.) rather than random noise clustered in one spot.
const STATION_TEMPLATE = [
  { latOffset: 0.05, lngOffset: 0.05, temp: 36 },
  { latOffset: 0.05, lngOffset: -0.05, temp: 30 },
  { latOffset: -0.05, lngOffset: 0.05, temp: 33 },
  { latOffset: -0.05, lngOffset: -0.05, temp: 26 },
  { latOffset: 0.1, lngOffset: 0, temp: 40 },
  { latOffset: -0.1, lngOffset: 0, temp: 24 },
  { latOffset: 0, lngOffset: 0.1, temp: 38 },
  { latOffset: 0, lngOffset: -0.1, temp: 28 },
  { latOffset: 0.02, lngOffset: 0.02, temp: 34 },
  { latOffset: -0.02, lngOffset: -0.02, temp: 29 },
  { latOffset: 0.15, lngOffset: 0.1, temp: 31 },
  { latOffset: -0.15, lngOffset: -0.1, temp: 27 },
];

const generateMockPoints = (center: Coordinates): HeatPoint[] => {
  return STATION_TEMPLATE.map((station, i) => ({
    id: `mock-${i}`,
    latitude: center.latitude + station.latOffset,
    longitude: center.longitude + station.lngOffset,
    temperature: station.temp,
  }));
};

export const mockHeatProvider: HeatDataProvider = {
  getHeatPoints: async center => {
    await new Promise<void>(resolve => setTimeout(() => resolve(), 400));
    return generateMockPoints(center);
  },
};
