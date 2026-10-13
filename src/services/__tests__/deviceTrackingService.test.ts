// The native tracking plugin can't load under Jest — only the pure ping
// conversion is under test here.
jest.mock('react-native-background-geolocation', () => ({}));

import { Location } from 'react-native-background-geolocation';
import { toIngestablePings } from '../deviceTrackingService';

const location = (overrides: Partial<Location> = {}): Location =>
  ({
    timestamp: '2026-08-29T16:00:00.000Z',
    coords: { latitude: 22.3399579, longitude: 114.2632457, speed: 0.3 },
    ...overrides,
  }) as Location;

describe('toIngestablePings', () => {
  it('converts live locations into the GeoJSON Point Features /ingest accepts', () => {
    expect(toIngestablePings([location()])).toEqual([
      {
        type: 'Feature',
        properties: { time: '2026-08-29T16:00:00.000Z', speed: 0.3 },
        geometry: { type: 'Point', coordinates: [114.2632457, 22.3399579] },
      },
    ]);
  });

  it('drops transient samples but keeps fake-GPS (mock) locations', () => {
    const pings = toIngestablePings([
      location({ sample: true }),
      location({ mock: true, timestamp: '2026-08-29T16:10:00.000Z' }),
    ]);
    expect(pings.map(p => p.properties.time)).toEqual(['2026-08-29T16:10:00.000Z']);
  });
});
