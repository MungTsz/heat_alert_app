import { AqhiDataProvider, AqhiPoint, Coordinates } from './types';
import { idwInterpolate } from '../../utils/idw';

const STATION_TEMPLATE = [
  { latOffset: 0.05, lngOffset: 0.05, aqhi: 7 },
  { latOffset: 0.05, lngOffset: -0.05, aqhi: 4 },
  { latOffset: -0.05, lngOffset: 0.05, aqhi: 5 },
  { latOffset: -0.05, lngOffset: -0.05, aqhi: 3 },
  { latOffset: 0.1, lngOffset: 0, aqhi: 8 },
  { latOffset: -0.1, lngOffset: 0, aqhi: 2 },
  { latOffset: 0, lngOffset: 0.1, aqhi: 6 },
  { latOffset: 0, lngOffset: -0.1, aqhi: 3 },
  { latOffset: 0.02, lngOffset: 0.02, aqhi: 6 },
  { latOffset: -0.02, lngOffset: -0.02, aqhi: 4 },
  { latOffset: 0.15, lngOffset: 0.1, aqhi: 5 },
  { latOffset: -0.15, lngOffset: -0.1, aqhi: 3 },
];

const generateMockPoints = (center: Coordinates): AqhiPoint[] => {
  return STATION_TEMPLATE.map((station, i) => ({
    id: `aqhi-mock-${i}`,
    latitude: center.latitude + station.latOffset,
    longitude: center.longitude + station.lngOffset,
    aqhi: station.aqhi,
  }));
};

const MOCK_DELAY_MS = 400;
const delay = () => new Promise<void>(resolve => setTimeout(() => resolve(), MOCK_DELAY_MS));

export const mockAqhiProvider: AqhiDataProvider = {
  getAqhiPoints: async center => {
    await delay();
    return generateMockPoints(center);
  },
  // IDW over the same mock ring, so a place reads like its map overlay.
  getAqhiAt: async coords => {
    await delay();
    return idwInterpolate(
      coords.latitude,
      coords.longitude,
      generateMockPoints(coords).map(p => ({
        latitude: p.latitude,
        longitude: p.longitude,
        value: p.aqhi,
      })),
    );
  },
};
