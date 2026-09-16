// src/hooks/useTodayExposure.ts
import { useCallback, useEffect, useRef, useState } from 'react';
import { ExposureReport } from '../types/exposure';
import { getTodayRawLocations, toLiveTrackingPing } from '../services/deviceTrackingService';
import { exposureDataProvider } from '../data/exposure';
import { DEFAULT_PID } from '../utils/exposurePid';
import { refreshHistoryCache } from '../services/exposureHistoryService';

// Matches HeatAlertEngine's foreground check cadence — this is a
// while-the-screen-is-open poll, not a background job.
const REFRESH_INTERVAL_MS = 5 * 60 * 1000;

export const useTodayExposure = (trackingEnabled: boolean) => {
  const [report, setReport] = useState<ExposureReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Only pings newer than this cursor get sent to /ingest each poll — the
  // ETL backend does its own windowing/classification/persistence now, so
  // the client just needs to avoid resending pings it already ingested.
  const lastIngestedAtMsRef = useRef(0);

  const refresh = useCallback(async () => {
    if (!trackingEnabled) return;
    setLoading(true);
    setError(null);
    try {
      const locations = await getTodayRawLocations();
      const newLocations = locations.filter(
        location => new Date(location.timestamp).getTime() > lastIngestedAtMsRef.current,
      );

      if (newLocations.length > 0) {
        const pings = newLocations.map(toLiveTrackingPing);
        await exposureDataProvider.ingest(DEFAULT_PID, pings);
        lastIngestedAtMsRef.current = Math.max(
          ...newLocations.map(location => new Date(location.timestamp).getTime()),
        );
      }

      const built = await exposureDataProvider.getHourlyReport(DEFAULT_PID);
      setReport(built);
      // Fire-and-forget — keeps the "DAILY EXPOSURE" history view fresh
      // without this poll waiting on a second network round trip.
      refreshHistoryCache(DEFAULT_PID).catch(() => {});
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to calculate exposure.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [trackingEnabled]);

  // A fresh mount (e.g. reopening the Exposure tab) starts the ingest cursor
  // over — it's an in-memory optimization for while this screen stays open,
  // not persisted state; the backend already has everything from earlier
  // sessions, so re-sending today's pings once is harmless.
  useEffect(() => {
    lastIngestedAtMsRef.current = 0;
    setReport(null);
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [refresh]);

  return { report, loading, error, refresh };
};
