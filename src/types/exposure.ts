// src/types/exposure.ts
export type TrackPoint = {
  lat: number;
  lon: number;
  timestampMs: number;
  speed?: number;
};

export type TrackSegment = {
  startTime: number;
  endTime: number;
  lat: number;
  lon: number;
  speed?: number;
};

// [t, pid, lng, lat, x, delta_t] — positional row format the deployed
// expo_calx endpoint actually accepts. The API doc describes a newer
// 9-field format (with record_id/speed/status), but the live Cal_Exposure.py
// still unpacks the older 6-field record — see the comment above
// fetchPraiseExposureCalc in services/praiseApi.ts. Kept as a tuple type so
// callers can't accidentally transpose fields.
export type ExposureRequestRow = [
  string, // t — YYYYMMDDHHmmss, HK local time
  string, // pid
  number, // lng
  number, // lat
  { IO: string }, // x — indoor/outdoor/tunnel + micro-environment JSON
  number, // delta_t — hours
];

export type ExposureResultRow = {
  ts: string;
  pid: string;
  exposure: number; // -9 if the API failed to calculate this row
};

export type ExposureSegmentResult = TrackSegment & {
  exposure: number;
};

export type ExposureReport = {
  totalExposure: number;
  segments: ExposureSegmentResult[];
  timeRangeStart: number;
  timeRangeEnd: number;
  pointCount: number;
};

// A day's exposure as persisted history — HK-local date key, either the
// live-tracked "today" snapshot or a frozen past day.
export type DailyExposureEntry = {
  date: string; // YYYY-MM-DD, HK local
  report: ExposureReport;
  updatedAt: number;
};

// A saved import (file or URL), revisitable without re-parsing/re-calling
// the API — may span multiple calendar days (see splitReportByDay.ts).
export type ImportHistoryEntry = {
  id: string;
  importedAt: number;
  sourceLabel: string;
  report: ExposureReport;
};

// One merged "stay" on the trajectory map — a run of chronologically
// consecutive segments within stayRadiusMeters of each other (see
// clusterStayPoints in utils/geoClustering.ts), rendered as a single dot
// sized by totalDurationMs instead of one dot per raw time bucket.
export type ExposureStayCluster = {
  lat: number;
  lon: number;
  startTime: number; // first merged segment's startTime
  endTime: number; // last merged segment's endTime
  // Sum of each merged segment's own duration — NOT (endTime - startTime) of
  // the whole run, since a tracking gap inside a stay (e.g. app killed for a
  // while) would otherwise silently inflate dwell time and dot size.
  totalDurationMs: number;
  mergedSegmentCount: number;
  totalExposure: number; // sum across merged segments, shown in the callout
};

// A named workspace for imported data tagged with its own pid — distinct
// from the live self-tracked device (DEFAULT_PID in useExposureReport.ts) —
// so a track imported from someone else's device/id can be browsed by date
// the same way the live device's history is, without mixing into it.
export type ExposureDevice = {
  id: string;
  name: string;
  createdAt: number;
};
