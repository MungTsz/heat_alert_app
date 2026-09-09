// src/hooks/useTodayExposure.ts
import { useCallback, useEffect, useRef, useState } from 'react';
import { ExposureReport, ExposureSegmentResult } from '../types/exposure';
import { getTodayTrackPoints } from '../services/deviceTrackingService';
import { bucketTrackPoints } from '../utils/trackSegmentation';
import { buildExposureRows } from '../utils/buildExposureRequestRows';
import { exposureDataProvider } from '../data/exposure';
import { DEFAULT_PID } from './useExposureReport';
import { toHkDateKey } from '../utils/hkDate';
import { saveDailyExposureReport } from '../services/exposureHistoryService';

// Matches HeatAlertEngine's foreground check cadence — this is a
// while-the-screen-is-open poll, not a background job.
const REFRESH_INTERVAL_MS = 5 * 60 * 1000;

export const useTodayExposure = (trackingEnabled: boolean) => {
  const [report, setReport] = useState<ExposureReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Segments a later point has already moved away from — their exposure is
  // final, so each is calculated once here and never resent to the API.
  // Refs, not state: this is refresh()'s own bookkeeping, not a render input.
  const confirmedSegmentsRef = useRef<ExposureSegmentResult[]>([]);
  const confirmedUpToRef = useRef(0);

  const refresh = useCallback(async () => {
    if (!trackingEnabled) return;
    setLoading(true);
    setError(null);
    try {
      const points = await getTodayTrackPoints();
      const newPoints = points.filter(
        p => p.timestampMs >= confirmedUpToRef.current,
      );
      const newSegments = bucketTrackPoints(newPoints);

      if (newSegments.length > 0) {
        // bucketTrackPoints always leaves its last window "open" (a later
        // point could still land in the same window) — only the earlier
        // ones in this new batch are truly final.
        const closing = newSegments.slice(0, -1);
        const growing = newSegments[newSegments.length - 1];
        const toCalculate = [...closing, growing];

        const rows = buildExposureRows(toCalculate, DEFAULT_PID);
        const results = await exposureDataProvider.calculateExposure(rows);
        const withExposure: ExposureSegmentResult[] = toCalculate.map(
          (segment, i) => ({
            ...segment,
            exposure: results[i]?.exposure ?? 0,
          }),
        );

        if (closing.length > 0) {
          confirmedSegmentsRef.current = [
            ...confirmedSegmentsRef.current,
            ...withExposure.slice(0, closing.length),
          ];
          confirmedUpToRef.current = closing[closing.length - 1].endTime;
        }
        const growingResult = withExposure[withExposure.length - 1];
        const segments = [...confirmedSegmentsRef.current, growingResult];

        const built: ExposureReport = {
          totalExposure: segments.reduce(
            (sum, s) => sum + (s.exposure > 0 ? s.exposure : 0),
            0,
          ),
          segments,
          timeRangeStart: segments[0].startTime,
          timeRangeEnd: segments[segments.length - 1].endTime,
          pointCount: points.length,
        };
        setReport(built);
        // Keeps today's persisted history entry fresh across this poll —
        // the only way past-day browsing/the 10-day chart can work, since
        // the tracking plugin itself only retains ~1 day of raw points.
        await saveDailyExposureReport(toHkDateKey(), built);
      } else if (confirmedSegmentsRef.current.length > 0) {
        setReport(prev => (prev ? { ...prev, pointCount: points.length } : prev));
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to calculate exposure.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [trackingEnabled]);

  // A fresh mount (e.g. reopening the Exposure tab) starts the incremental
  // bookkeeping over — it's an in-memory optimization for while this screen
  // stays open, not persisted state.
  useEffect(() => {
    confirmedSegmentsRef.current = [];
    confirmedUpToRef.current = 0;
    setReport(null);
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [refresh]);

  return { report, loading, error, refresh };
};
