// src/hooks/useExposureTrackingSettings.ts
import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { startTracking, stopTracking } from '../services/deviceTrackingService';

const STORAGE_KEY = 'exposure_tracking_enabled';

// Background location is sensitive, so this is opt-in and off by default —
// mirrors the AsyncStorage-backed settings pattern used by
// useBookmarkList/useNotificationSettings.
export const useExposureTrackingSettings = () => {
  const [enabled, setEnabledState] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        const value = raw === 'true';
        setEnabledState(value);
        if (value) await startTracking();
      } catch (error) {
        console.log('Failed to load exposure tracking setting:', error);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const setEnabled = useCallback(async (value: boolean) => {
    setEnabledState(value);
    await AsyncStorage.setItem(STORAGE_KEY, value ? 'true' : 'false');
    if (value) {
      await startTracking();
    } else {
      await stopTracking();
    }
  }, []);

  return { enabled, loading, setEnabled };
};
