jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: { getItem: jest.fn(), setItem: jest.fn() },
}));

// The native tracking plugin can't load under Jest — stubbed down to the
// calls the heartbeat path makes.
jest.mock('react-native-background-geolocation', () => ({
  __esModule: true,
  default: {
    Event: { Heartbeat: 'heartbeat', Terminate: 'terminate' },
    getState: jest.fn(),
    getCurrentPosition: jest.fn(),
  },
}));

import BackgroundGeolocation, {
  HeadlessEvent,
  Location,
} from 'react-native-background-geolocation';
import {
  handleTrackingHeadlessEvent,
  toIngestablePings,
} from '../deviceTrackingService';
import { EXPOSURE_TRACKING_CONFIG } from '../../config/exposureTrackingConfig';

const getState = BackgroundGeolocation.getState as jest.Mock;
const getCurrentPosition = BackgroundGeolocation.getCurrentPosition as jest.Mock;

const headless = (name: string): HeadlessEvent =>
  ({ name, params: {} }) as HeadlessEvent;

describe('handleTrackingHeadlessEvent', () => {
  beforeEach(() => {
    getState.mockReset();
    getCurrentPosition.mockReset().mockResolvedValue({});
  });

  it('records a persisted fix on a heartbeat while the phone is still', async () => {
    getState.mockResolvedValue({ enabled: true, isMoving: false });
    await handleTrackingHeadlessEvent(headless('heartbeat'));
    expect(getCurrentPosition).toHaveBeenCalledWith({
      samples: EXPOSURE_TRACKING_CONFIG.currentPosition.samples,
      timeout: EXPOSURE_TRACKING_CONFIG.currentPosition.timeoutSeconds,
      maximumAge: EXPOSURE_TRACKING_CONFIG.currentPosition.maximumAgeMs,
      persist: true,
    });
  });

  it('leaves moving phones to the distance filter', async () => {
    getState.mockResolvedValue({ enabled: true, isMoving: true });
    await handleTrackingHeadlessEvent(headless('heartbeat'));
    expect(getCurrentPosition).not.toHaveBeenCalled();
  });

  it('records nothing once tracking is off', async () => {
    getState.mockResolvedValue({ enabled: false, isMoving: false });
    await handleTrackingHeadlessEvent(headless('heartbeat'));
    expect(getCurrentPosition).not.toHaveBeenCalled();
  });

  it('ignores other plugin events', async () => {
    await handleTrackingHeadlessEvent(headless('terminate'));
    expect(getState).not.toHaveBeenCalled();
  });

  it('swallows a fix that times out indoors', async () => {
    getState.mockResolvedValue({ enabled: true, isMoving: false });
    getCurrentPosition.mockRejectedValue(new Error('timeout'));
    await expect(handleTrackingHeadlessEvent(headless('heartbeat'))).resolves.toBeUndefined();
  });
});

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
