// src/types/exposure.ts

// A GeoJSON Point feature as exported by phone/watch GPS logging apps —
// properties.time as ISO8601, geometry.coordinates as [lng, lat],
// properties.speed in m/s (negative = unknown). The only record shape the
// exposure ETL backend's /ingest accepts: imported files are sent as-is and
// live-tracked locations are converted into it (see deviceTrackingService).
export type GeoJsonPointFeature = {
  type: 'Feature';
  properties: { time: string; speed?: number };
  geometry: { type: 'Point'; coordinates: [number, number] };
};

export type ExposureIngestFeature = GeoJsonPointFeature;

// An imported track file's format — decides which ingest endpoint it goes
// to (GeoJSON → POST /ingest as JSON, GPX → POST /ingest/gpx as raw XML).
export type TrackFileFormat = 'geojson' | 'gpx';

// The backend's io types fall into three groups by how much of the outdoor
// environment a person is exposed to: open air (Outdoor), enclosed transport
// (Vehicle on the roads, MTR mostly underground), and sheltered indoors. The
// groups are declared separately so the legend can chunk them and
// PlaceCategory can be derived from the indoor group alone.
export const EXPOSURE_TRANSIT_IO_TYPES = ['Vehicle', 'MTR'] as const;
// A stay inside a user-labelled place circle (see PlaceCategory in
// types/bookmark.ts) takes that place's category; an unlabelled one is Home
// when it overlaps the 00:00-06:00 HK night window (or sits near such a
// stay), anything else Other Indoor — Office/School are never guessed.
export const EXPOSURE_INDOOR_IO_TYPES = ['Other Indoor', 'School', 'Office', 'Home'] as const;
// Stack/legend order (bottom → top): Outdoor sits on the baseline because
// it's the main exposure driver and only the bottom layer can be compared
// across bars by height; then decreasing contact with outdoor air.
export const EXPOSURE_IO_TYPES = [
  'Outdoor',
  ...EXPOSURE_TRANSIT_IO_TYPES,
  ...EXPOSURE_INDOOR_IO_TYPES,
] as const;
export type ExposureIo = (typeof EXPOSURE_IO_TYPES)[number];

// A backend point is either a whole stay (one point at the median of its
// pings, incl. an MTR interchange) or one kept ping of a route (walk,
// vehicle, MTR ride) — routes are drawn as lines, stays as dots.
export type ExposurePointKind = 'stay' | 'route';

// One row of the ETL backend's GET /exposure/hourly/{pid} response — one per
// point (a stay, or one thinned route ping), or one per hour-slice of a
// point whose time crosses an HK clock hour (prorated delta_t_hours per
// slice, not reclassified per hour; the slices repeat the position). Rows
// are keyed by (pid, io, start_time_hk), so many rows can share the same
// hour_start_hk + io (e.g. every point of one walk).
export type ExposureHourlyApiRow = {
  hour_start_hk: string; // YYYYMMDDHHMMSS, HK local, truncated to the hour — group by this (+io) for the bar chart
  start_time_hk: string; // YYYYMMDDHHMMSS, HK local — this row's own precise start; sort by this for the map route
  // Raw string, not ExposureIo: the backend may add io types (and older
  // rows said 'Indoor'), so it's mapped via normalizeExposureIo on adapt.
  io: string;
  // 'label' when a crowd-sourced place label decided io, 'inferred' when the
  // backend's own stay rules did. Optional because rows stored before place
  // labels existed don't have it.
  io_source?: ExposureIoSource;
  // Which backend rule decided io ('jump', 'night_stay', 'place_label', …).
  // Raw string so a new rule degrades to "no explanation" instead of a
  // crash; null/absent on rows stored before the field existed.
  reason?: string | null;
  // null/absent on rows stored before routes existed — those were one row
  // per dwell run, i.e. stays.
  kind?: ExposurePointKind | null;
  delta_t_hours: number;
  // null when in_hk is false (never scored), or expo_calx failed for this row.
  exposure_value: number | null;
  lng: number;
  lat: number;
  // Route points: direction to the next point, degrees clockwise from north
  // (compass: the same as N/NE/…); null for stays. Not read: the map's
  // arrows take their direction from the drawn line itself. The backend
  // gives a run's LAST point the heading of the segment before it, not of
  // the segment to the next run's point that the map draws — on the real
  // 2026-08-30 sample 7 of 485 edges (every leg's final one) disagreed by
  // 20-150°, i.e. arrows pointing backwards.
  heading_deg?: number | null;
  compass?: string | null;
  // Vehicle route points: English name of the road within 30 m.
  road_name?: string | null;
  // expo_calx only scores Hong Kong — rows outside are still returned so
  // the route can be drawn, but carry no exposure. Optional because rows
  // ingested before the backend added the field don't have it.
  in_hk?: boolean;
};

export type ExposureIoSource = 'label' | 'inferred';

// POST /ingest's 202 body — the pipeline runs as a background job.
export type ExposureIngestAccepted = {
  status: 'queued';
  batch_id: number;
};

// GET /ingest/{batch_id} — the background job's progress.
export type ExposureBatchStatus = {
  id: number;
  pid: string;
  status: 'pending' | 'processing' | 'done' | 'error';
  error_detail: string | null;
  hours_processed: number | null;
  rows: number | null;
  created_at: string;
  updated_at: string;
};

// What an ingest call reports back once its batch is done — lets the import
// screen show "N GPS points received → M time segments" so a much smaller
// output count doesn't read as lost data. processedRows is the batch's own
// `rows`: time segments (stays / thinned route points, split per HK clock
// hour) this upload wrote, incl. out-of-HK and failed-PRAISE rows — not
// "valid GPS points". The API always returns an integer once done; null
// only comes from the mock provider.
export type ExposureIngestResult = { processedRows: number | null };

// One hourly-API row adapted into the shape the app's UI already renders
// (map clustering, trend chart, segment list, CSV export). startTime is the
// row's precise start (from start_time_hk); endTime approximates it as
// startTime + delta_t_hours — the backend doesn't expose the real dwell-run
// end, only its (possibly hour-sliced) duration.
export type ExposureSegmentResult = {
  startTime: number;
  endTime: number;
  lat: number;
  lon: number;
  exposure: number;
  io: ExposureIo;
  // false = outside Hong Kong: drawn on the map (in a neutral color) but
  // exposure is always 0 and must not be read as "zero exposure".
  inHk: boolean;
  // The new per-point fields are optional because segments cached in
  // AsyncStorage before the backend sent them don't have them. A missing
  // kind reads as 'stay' (the old rows were one per dwell run).
  kind?: ExposurePointKind;
  reason?: string;
  ioSource?: ExposureIoSource;
  roadName?: string;
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
  io: ExposureIo;
  inHk: boolean; // runs never mix in/out-of-HK segments (see clusterStayPoints)
  // The anchor segment's — explains in the stay sheet why the stay got its io.
  reason?: string;
  ioSource?: ExposureIoSource;
};

// One leg of travel on the trajectory map — a run of chronologically
// consecutive route segments sharing io / inHk / pathInferred (see
// buildTripLegs in utils/exposureTrajectory.ts), drawn as one polyline.
export type ExposureTripLeg = {
  io: ExposureIo;
  inHk: boolean;
  // true for an MTR ride the backend inferred from a GPS jump (no pings
  // underground): the line between stations is a straight-line guess, not
  // the travelled path, so it's drawn dashed.
  pathInferred: boolean;
  path: { latitude: number; longitude: number }[];
  startTime: number;
  endTime: number;
  totalDurationMs: number; // summed per segment, same reason as ExposureStayCluster
  totalExposure: number;
  // Distinct road names in travel order (Vehicle legs only).
  roadNames: string[];
  reason?: string;
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
