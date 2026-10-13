// src/hooks/useExposureHistory.ts
import { useCallback, useEffect, useState } from 'react';
import { DailyExposureEntry } from '../types/exposure';
import {
  deleteHistoryDay,
  getCachedDailyExposureHistory,
  refreshHistoryCache,
} from '../services/exposureHistoryService';
import { DEFAULT_PID } from '../utils/exposurePid';

// deviceId defaults to the live self-tracked device — pass a named device's
// id (see useExposureDevices.ts) to browse that device's history instead.
export const useExposureHistory = (deviceId: string = DEFAULT_PID) => {
  const [history, setHistory] = useState<DailyExposureEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      // Paint the cached snapshot immediately, then replace it with a fresh
      // fetch — on network failure the cached value just stays put.
      setHistory(await getCachedDailyExposureHistory(deviceId));
      setHistory(await refreshHistoryCache(deviceId));
    } catch (error) {
      console.log('Failed to load exposure history:', error);
    } finally {
      setLoading(false);
    }
  }, [deviceId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Rethrows on failure (unlike refresh) so the caller can tell the user
  // the day wasn't deleted.
  const deleteDay = useCallback(
    async (dateKey: string) => {
      setHistory(await deleteHistoryDay(deviceId, dateKey));
    },
    [deviceId],
  );

  return { history, loading, refresh, deleteDay };
};
