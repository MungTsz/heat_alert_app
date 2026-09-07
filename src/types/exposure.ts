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
