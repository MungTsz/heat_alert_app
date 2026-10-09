import Config from 'react-native-config';

// The local exposure ETL backend (exposure_api_github) — no safe hardcoded
// default is possible since its LAN IP is per-dev-machine, unlike PRAISE's
// fixed public base URLs.
//
// timeoutMs defaults well above the platform's ~60s default networking
// timeout: /ingest triggers GPS-spike rejection, indoor/outdoor dwell
// classification, and the expo_calx call server-side, which can run long
// for a large batch of pings — the default was cutting those requests off
// before the backend finished.
export const EXPOSURE_API_CONFIG = {
  baseUrl: Config.EXPOSURE_API_BASE_URL ?? '',
  timeoutMs: Number(Config.EXPOSURE_API_TIMEOUT_MS) || 180000,
  // Mirrors the backend's MAX_INGEST_BODY_BYTES (25 MB default). Checked
  // client-side before upload so an oversized file fails fast with a clear
  // message instead of being sent in full only to come back as a 413.
  maxIngestBodyBytes: Number(Config.EXPOSURE_API_MAX_INGEST_BYTES) || 26214400,
  // /ingest now answers 202 at once and runs the pipeline as a background
  // job; each expo_calx call takes ~20-30s and batches share a server-wide
  // concurrency cap, so poll at a relaxed cadence with a generous ceiling.
  batchPollIntervalMs: Number(Config.EXPOSURE_API_BATCH_POLL_MS) || 3000,
  batchMaxWaitMs: Number(Config.EXPOSURE_API_BATCH_MAX_WAIT_MS) || 15 * 60 * 1000,
};

// Lets exposureDataProvider fall back to mock data gracefully when the
// backend URL isn't configured yet, same pattern as isPraiseConfigured().
export const isExposureApiConfigured = (): boolean =>
  EXPOSURE_API_CONFIG.baseUrl.length > 0;
