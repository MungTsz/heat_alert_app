import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  NotificationSettings,
  DEFAULT_NOTIFICATION_SETTINGS,
  HeatLevel,
} from '../types/settings';

const STORAGE_KEY = 'notification_settings';

export const useNotificationSettings = () => {
  const [settings, setSettings] = useState<NotificationSettings>(
    DEFAULT_NOTIFICATION_SETTINGS,
  );
  const [loading, setLoading] = useState(true);

  const loadSettings = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        // Merge with defaults so any newly-added fields (e.g. a future heat
        // level) still get a sensible value even for users on an older save.
        setSettings({
          ...DEFAULT_NOTIFICATION_SETTINGS,
          ...parsed,
          alertLevels: {
            ...DEFAULT_NOTIFICATION_SETTINGS.alertLevels,
            ...(parsed.alertLevels ?? {}),
          },
        });
      } else {
        setSettings(DEFAULT_NOTIFICATION_SETTINGS);
      }
    } catch (error) {
      console.log('Failed to load notification settings:', error);
      setSettings(DEFAULT_NOTIFICATION_SETTINGS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const persist = async (updated: NotificationSettings) => {
    setSettings(updated);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const toggleAlertLevel = (level: HeatLevel, value: boolean) => {
    persist({
      ...settings,
      alertLevels: { ...settings.alertLevels, [level]: value },
    });
  };

  const setNotifyCurrentLocation = (value: boolean) => {
    persist({ ...settings, notifyCurrentLocation: value });
  };

  const setNotifyBookmarkedLocations = (value: boolean) => {
    persist({ ...settings, notifyBookmarkedLocations: value });
  };

  return {
    settings,
    loading,
    toggleAlertLevel,
    setNotifyCurrentLocation,
    setNotifyBookmarkedLocations,
  };
};
