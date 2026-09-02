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

// [record_id, t, pid, lng, lat, x, delta_t, speed, status] — positional row
// format required by the get_exposure_list API (see "API for calculating
// Exposure" doc). Kept as a tuple type so callers can't accidentally
// transpose fields.
export type ExposureRequestRow = [
  string, // record_id — 'NULL' for ad-hoc (non-DB-backed) calculations
  string, // t — YYYYMMDDHHmmss, HK local time
  string, // pid
  number, // lng
  number, // lat
  { IO: string }, // x — indoor/outdoor/tunnel + micro-environment JSON
  number, // delta_t — hours
  number, // speed
  number, // status — always -1 on input ("please calculate")
];

export type ExposureResultRow = {
  recordId: string;
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
