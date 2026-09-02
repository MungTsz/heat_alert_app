// src/hooks/useTodayExposure.ts
import { useCallback, useEffect } from 'react';
import { useExposureReport } from './useExposureReport';
import { getTodayTrackPoints } from '../services/deviceTrackingService';

export const useTodayExposure = (trackingEnabled: boolean) => {
  const { report, loading, error, generate } = useExposureReport();

  const refresh = useCallback(async () => {
    if (!trackingEnabled) return;
    const points = await getTodayTrackPoints();
    await generate(points);
  }, [trackingEnabled, generate]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { report, loading, error, refresh };
};
