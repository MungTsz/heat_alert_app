// AsyncStorage ships as ESM, which jest doesn't transform — and this suite
// only exercises the pure normalizer anyway.
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: { getItem: jest.fn(), setItem: jest.fn() },
}));

import { normalizeNotificationSettings } from '../notificationSettingsStorage';
import { DEFAULT_NOTIFICATION_SETTINGS } from '../../config/alertConfig';

describe('normalizeNotificationSettings', () => {
  it('fills every field for a first launch', () => {
    expect(normalizeNotificationSettings(null)).toEqual(DEFAULT_NOTIFICATION_SETTINGS);
  });

  it('drops the retired global level toggles but keeps the source switches', () => {
    const legacy = {
      alertLevels: { Safe: false, Caution: true, 'Extreme Caution': true, Danger: true, 'Extreme Danger': true },
      aqhiAlertLevels: { Low: false, Moderate: false, High: true, 'Very High': true, Serious: true },
      notifyCurrentLocation: false,
      notifyBookmarkedLocations: true,
    };
    const settings = normalizeNotificationSettings(legacy);
    expect(settings).not.toHaveProperty('alertLevels');
    expect(settings).not.toHaveProperty('aqhiAlertLevels');
    expect(settings.notifyCurrentLocation).toBe(false);
    expect(settings.currentLocationProfile.audience).toBe('general');
  });

  it('always treats your own location as for yourself', () => {
    const settings = normalizeNotificationSettings({
      currentLocationProfile: { audience: 'chronic', caringFor: 'family', hazards: { heat: false } },
    });
    expect(settings.currentLocationProfile).toEqual({
      audience: 'chronic',
      caringFor: 'self',
      hazards: { heat: false, aqhi: true },
    });
  });
});
