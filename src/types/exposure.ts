// src/types/exposure.ts

// A GeoJSON Point feature as exported by phone/watch GPS logging apps —
// properties.time as ISO8601, geometry.coordinates as [lng, lat]. Sent
// as-is to the exposure ETL backend's /ingest endpoint.
export type GeoJsonPointFeature = {
  type: 'Feature';
  properties: { time: string; speed?: number };
  geometry: { type: 'Point'; coordinates: [number, number] };
};

// A live-tracking ping in react-native-background-geolocation's own shape —
// also accepted as-is by /ingest. `sample:true` pings are transient reads
// the backend drops; `mock:true` (fake-GPS) pings are kept.
export type LiveTrackingPing = {
  timestamp: string;
  coords: { latitude: number; longitude: number };
  sample?: boolean;
  mock?: boolean;
};

export type ExposureIngestFeature = GeoJsonPointFeature | LiveTrackingPing;

// One row of the ETL backend's GET /exposure/hourly/{pid} response — one per
// (hour, indoor/outdoor). A dwell run crossing an hour boundary is split
// into per-hour-touched rows with a prorated delta_t_hours, not reclassified
// per hour. lat/lng are the dwell run's first-ping reference point; if
// multiple same-labelled runs land in the same hour, only the
// last-processed run's coordinates survive (no averaging).
export type ExposureHourlyApiRow = {
  hour_start_hk: string; // YYYYMMDDHHMMSS, HK local, truncated to the hour
  io: 'Indoor' | 'Outdoor';
  delta_t_hours: number;
  exposure_value: number;
  lng: number;
  lat: number;
};

// One hourly-API row adapted into the shape the app's UI already renders
// (map clustering, trend chart, segment list, CSV export). startTime is the
// row's hour boundary; endTime approximates it as startTime + delta_t_hours
// — the backend doesn't expose the real dwell-run start/end, only the
// per-hour prorated duration.
export type ExposureSegmentResult = {
  startTime: number;
  endTime: number;
  lat: number;
  lon: number;
  exposure: number;
  io: 'Indoor' | 'Outdoor';
};

export type ExposureReport = {
  totalExposure: number;
  segments: ExposureSegmentResult[];
  timeRangeStart: number;
  timeRangeEnd: number;
  pointCount: number;
};

// A day's exposure as cached from the backend — HK-local date key, either
// the live-tracked "today" snapshot or a frozen past day.
export type DailyExposureEntry = {
  date: string; // YYYY-MM-DD, HK local
  report: ExposureReport;
  updatedAt: number;
};

// A saved import-log entry — points at the pid the imported data was
// ingested under (its own report is re-fetched from the backend on open,
// not embedded here, since the backend is now the source of truth).
export type ImportHistoryEntry = {
  id: string;
  importedAt: number;
  sourceLabel: string;
  previewPid: string;
};

// One merged "stay" on the trajectory map — a run of chronologically
// consecutive same-io segments within stayRadiusMeters of each other (see
// clusterStayPoints in utils/geoClustering.ts), rendered as a single dot
// sized by totalDurationMs instead of one dot per raw hourly row.
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
  io: 'Indoor' | 'Outdoor';
};

// A named workspace for imported data tagged with its own pid — distinct
// from the live self-tracked device (DEFAULT_PID in utils/exposurePid.ts) —
// so a track imported from someone else's device/id can be browsed by date
// the same way the live device's history is, without mixing into it.
export type ExposureDevice = {
  id: string;
  name: string;
  createdAt: number;
};
