// src/hooks/useExposureReport.ts
import { useCallback, useState } from 'react';
import { TrackPoint, ExposureReport } from '../types/exposure';
import { bucketTrackPoints } from '../utils/trackSegmentation';
import { buildExposureRows } from '../utils/buildExposureRequestRows';
import { exposureDataProvider } from '../data/exposure';

export const DEFAULT_PID = 'local-device';

export const useExposureReport = () => {
  const [report, setReport] = useState<ExposureReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(
    async (points: TrackPoint[], pid: string = DEFAULT_PID) => {
      setLoading(true);
      setError(null);
      try {
        const segments = bucketTrackPoints(points);

        if (segments.length === 0) {
          const empty: ExposureReport = {
            totalExposure: 0,
            segments: [],
            timeRangeStart: points[0]?.timestampMs ?? 0,
            timeRangeEnd: points[points.length - 1]?.timestampMs ?? 0,
            pointCount: points.length,
          };
          setReport(empty);
          return empty;
        }

        const rows = buildExposureRows(segments, pid);
        const results = await exposureDataProvider.calculateExposure(rows);

        const segmentResults = segments.map((segment, i) => ({
          ...segment,
          exposure: results[i]?.exposure ?? 0,
        }));

        const totalExposure = segmentResults.reduce(
          (sum, s) => sum + (s.exposure > 0 ? s.exposure : 0),
          0,
        );

        const built: ExposureReport = {
          totalExposure,
          segments: segmentResults,
          timeRangeStart: segments[0].startTime,
          timeRangeEnd: segments[segments.length - 1].endTime,
          pointCount: points.length,
        };
        setReport(built);
        return built;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to calculate exposure.';
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const reset = useCallback(() => {
    setReport(null);
    setError(null);
  }, []);

  return { report, loading, error, generate, reset };
};
