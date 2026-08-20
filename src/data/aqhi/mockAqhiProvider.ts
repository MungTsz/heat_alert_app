import { AqhiDataProvider, AqhiPoint, Coordinates } from './types';

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

export const mockAqhiProvider: AqhiDataProvider = {
  getAqhiPoints: async center => {
    await new Promise<void>(resolve => setTimeout(() => resolve(), 400));
    return generateMockPoints(center);
  },
};
