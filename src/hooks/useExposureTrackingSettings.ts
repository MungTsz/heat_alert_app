// src/hooks/useExposureTrackingSettings.ts
import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  startTracking,
  stopTracking,
  TRACKING_ENABLED_STORAGE_KEY,
} from '../services/deviceTrackingService';

// Background location is sensitive, so this is opt-in and off by default —
// mirrors the AsyncStorage-backed settings pattern used by
// useBookmarkList/useNotificationSettings. Resuming tracking on launch is
// App.tsx's job (resumeTrackingIfEnabled), so this hook only reads the flag.
export const useExposureTrackingSettings = () => {
  const [enabled, setEnabledState] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(TRACKING_ENABLED_STORAGE_KEY);
        setEnabledState(raw === 'true');
      } catch (error) {
        console.log('Failed to load exposure tracking setting:', error);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const setEnabled = useCallback(async (value: boolean) => {
    setEnabledState(value);
    try {
      if (value) {
        await startTracking();
      } else {
        await stopTracking();
      }
      await AsyncStorage.setItem(TRACKING_ENABLED_STORAGE_KEY, value ? 'true' : 'false');
    } catch (error) {
      // e.g. location permission denied — flip the switch back so it never
      // shows "on" while nothing is actually being tracked.
      console.log('Failed to change exposure tracking:', error);
      setEnabledState(!value);
    }
  }, []);

  return { enabled, loading, setEnabled };
};
