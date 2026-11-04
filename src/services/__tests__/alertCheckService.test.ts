const mockStore = new Map<string, string>();

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn((key: string) => Promise.resolve(mockStore.get(key) ?? null)),
    setItem: jest.fn((key: string, value: string) => {
      mockStore.set(key, value);
      return Promise.resolve();
    }),
    removeItem: jest.fn((key: string) => {
      mockStore.delete(key);
      return Promise.resolve();
    }),
  },
}));

const mockDisplay = jest.fn((_n: { title: string; body: string }) => Promise.resolve('id'));
jest.mock('@notifee/react-native', () => ({
  __esModule: true,
  default: {
    requestPermission: jest.fn(() => Promise.resolve()),
    createChannel: jest.fn(() => Promise.resolve('channel')),
    displayNotification: (n: { title: string; body: string }) => mockDisplay(n),
  },
  AndroidImportance: { HIGH: 4 },
  AndroidStyle: { BIGTEXT: 1 },
}));

// Values the fake data layer serves, by hazard.
const mockValues = { heat: 30, aqhi: 4 };
let mockPraiseConfigured = true;

jest.mock('../../data/heat', () => ({
  heatDataProvider: { getHeatIndexAt: () => Promise.resolve(mockValues.heat) },
}));
jest.mock('../../data/forecast', () => ({
  forecastDataProvider: { getForecast: () => Promise.resolve([]) },
}));
jest.mock('../../data/aqhi', () => ({
  aqhiDataProvider: { getAqhiAt: () => Promise.resolve(mockValues.aqhi) },
}));
jest.mock('../../data/aqhiForecast', () => ({
  aqhiForecastProvider: { getForecast: () => Promise.resolve([]) },
}));
jest.mock('../../config/praiseConfig', () => ({
  isPraiseConfigured: () => mockPraiseConfigured,
}));
jest.mock('../placeLabelSyncService', () => ({ syncPlaceLabels: jest.fn() }));

import { runAlertCheck } from '../alertCheckService';
import { BookmarkEntry } from '../../types/bookmark';

const NOON_HKT = Date.UTC(2026, 10, 4, 4);
const MIN = 60 * 1000;

const mumsHome: BookmarkEntry = {
  id: 'mum',
  label: "Mum's home",
  address: 'Kwun Tong',
  latitude: 22.31,
  longitude: 114.22,
  category: 'Home',
  radiusMeters: 100,
  updatedAt: 1,
  alertProfile: { audience: 'sensitive', caringFor: 'family', hazards: { heat: true, aqhi: true } },
};

const setNow = (ms: number) => jest.spyOn(Date, 'now').mockReturnValue(ms);

beforeEach(() => {
  mockStore.clear();
  mockDisplay.mockClear();
  mockValues.heat = 30;
  mockValues.aqhi = 4;
  mockPraiseConfigured = true;
  mockStore.set('monitored_bookmarks', JSON.stringify([mumsHome]));
  mockStore.set(
    'notification_settings',
    JSON.stringify({ notifyCurrentLocation: false, notifyBookmarkedLocations: true }),
  );
});

afterEach(() => jest.restoreAllMocks());

describe('runAlertCheck', () => {
  it('sends one merged alert after the batching wait, then stays quiet', async () => {
    mockValues.aqhi = 7; // High: reaches the older-adult level
    setNow(NOON_HKT);
    await runAlertCheck({ coords: null });
    expect(mockDisplay).not.toHaveBeenCalled();

    setNow(NOON_HKT + 10 * MIN);
    await runAlertCheck({ coords: null });
    expect(mockDisplay).toHaveBeenCalledTimes(1);
    expect(mockDisplay.mock.calls[0][0].title).toBe('Air quality now High (7)');
    expect(mockDisplay.mock.calls[0][0].body).toContain('Call to remind them');

    setNow(NOON_HKT + 15 * MIN);
    await runAlertCheck({ coords: null });
    expect(mockDisplay).toHaveBeenCalledTimes(1);
  });

  it('never alerts on mock AQHI when PRAISE is not configured', async () => {
    mockPraiseConfigured = false;
    mockValues.aqhi = 10;
    setNow(NOON_HKT);
    await runAlertCheck({ coords: null, flush: true });
    expect(mockDisplay).not.toHaveBeenCalled();
  });

  it('skips the current location when the real position is unknown', async () => {
    mockStore.set('monitored_bookmarks', JSON.stringify([]));
    mockStore.set('notification_settings', JSON.stringify({ notifyCurrentLocation: true }));
    mockValues.aqhi = 10;
    setNow(NOON_HKT);
    await runAlertCheck({ coords: null, flush: true });
    expect(mockDisplay).not.toHaveBeenCalled();
  });

  it('merges both hazards at one place into a double-risk alert', async () => {
    mockValues.aqhi = 7;
    mockValues.heat = 36; // Extreme Caution: the older-adult heat level
    setNow(NOON_HKT);
    await runAlertCheck({ coords: null, flush: true });
    expect(mockDisplay).toHaveBeenCalledTimes(1);
    expect(mockDisplay.mock.calls[0][0].title).toBe('Poor air quality and heat now');
  });
});
