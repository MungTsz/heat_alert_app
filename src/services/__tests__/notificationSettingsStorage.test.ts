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
    expect(settings.currentLocationProfile.identities).toEqual(['general']);
  });

  it('asks "About you" once — until it is answered, and never again after', () => {
    expect(normalizeNotificationSettings(null).aboutYouConfirmed).toBe(false);
    // Saves from before the first-launch question existed get asked once.
    expect(normalizeNotificationSettings({ notifyCurrentLocation: true }).aboutYouConfirmed).toBe(false);
    expect(normalizeNotificationSettings({ aboutYouConfirmed: true }).aboutYouConfirmed).toBe(true);
  });

  it('always treats your own location as for yourself', () => {
    const settings = normalizeNotificationSettings({
      currentLocationProfile: {
        identities: ['asthma'],
        takesRegularMedicine: true,
        dailyActivity: 'outdoors',
        caringFor: 'family',
        hazards: { heat: false },
      },
    });
    expect(settings.currentLocationProfile).toEqual({
      identities: ['asthma'],
      takesRegularMedicine: true,
      dailyActivity: 'outdoors',
      caringFor: 'self',
      hazards: { heat: false, aqhi: true },
    });
  });

  it('converts an old one-choice About you answer and asks to check a guessed one', () => {
    const settings = normalizeNotificationSettings({
      aboutYouConfirmed: true,
      currentLocationProfile: { audience: 'chronic', caringFor: 'self', hazards: {} },
    });
    expect(settings.currentLocationProfile).toEqual({
      identities: ['heartLung'],
      takesRegularMedicine: false,
      dailyActivity: 'indoors',
      caringFor: 'self',
      hazards: { heat: true, aqhi: true },
      needsReview: true,
    });
    // Still answered — the check is a separate, one-off prompt.
    expect(settings.aboutYouConfirmed).toBe(true);
  });
});
