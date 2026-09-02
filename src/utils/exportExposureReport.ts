// src/utils/exportExposureReport.ts
import { ExposureReport } from '../types/exposure';

const MS_PER_HOUR = 3600000;

// Builds a plain CSV string from an exposure report — one row per segment.
export const buildExposureReportCsv = (report: ExposureReport): string => {
  const header = [
    'start_time',
    'end_time',
    'latitude',
    'longitude',
    'duration_hours',
    'exposure',
  ].join(',');

  const rows = report.segments.map(segment => {
    const durationHours = (segment.endTime - segment.startTime) / MS_PER_HOUR;
    return [
      new Date(segment.startTime).toISOString(),
      new Date(segment.endTime).toISOString(),
      segment.lat.toFixed(6),
      segment.lon.toFixed(6),
      durationHours.toFixed(4),
      segment.exposure.toFixed(4),
    ].join(',');
  });

  return [header, ...rows].join('\n');
};
