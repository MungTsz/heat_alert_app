// src/services/notificationSettingsStorage.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NotificationSettings } from '../types/settings';
import { DEFAULT_NOTIFICATION_SETTINGS } from '../config/alertConfig';
import { resolveAlertProfile } from '../utils/alertProfile';

const STORAGE_KEY = 'notification_settings';

// Builds a complete settings object from whatever is stored, field by field.
// Picking known fields (rather than spreading the stored object) is what
// drops the retired global level toggles (alertLevels / aqhiAlertLevels)
// from older saves: alert levels now come from each place's "who is here",
// so those users start from the General adult defaults.
export const normalizeNotificationSettings = (stored: unknown): NotificationSettings => {
  const s = (stored ?? {}) as Partial<NotificationSettings>;
  const d = DEFAULT_NOTIFICATION_SETTINGS;
  return {
    currentLocationProfile: {
      ...resolveAlertProfile(s.currentLocationProfile),
      // Your own location is always for yourself.
      caringFor: 'self',
    },
    notifyCurrentLocation: s.notifyCurrentLocation ?? d.notifyCurrentLocation,
    notifyBookmarkedLocations: s.notifyBookmarkedLocations ?? d.notifyBookmarkedLocations,
    allClear: s.allClear ?? d.allClear,
    quietHours: { ...d.quietHours, ...s.quietHours },
    digests: {
      evening: { ...d.digests.evening, ...s.digests?.evening },
      morning: { ...d.digests.morning, ...s.digests?.morning },
    },
    breakingUpdates: s.breakingUpdates ?? d.breakingUpdates,
    noEventDays: s.noEventDays ?? d.noEventDays,
  };
};

// Read straight from storage every time, like readBookmarks: the alert
// check and several screens each hold their own hook instance, and only the
// stored copy is guaranteed current.
export const readNotificationSettings = async (): Promise<NotificationSettings> => {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return normalizeNotificationSettings(raw ? JSON.parse(raw) : null);
  } catch (error) {
    console.log('Failed to load notification settings:', error);
    return DEFAULT_NOTIFICATION_SETTINGS;
  }
};

export const writeNotificationSettings = (settings: NotificationSettings): Promise<void> =>
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
