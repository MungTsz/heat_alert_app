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
};

// Lets exposureDataProvider fall back to mock data gracefully when the
// backend URL isn't configured yet, same pattern as isPraiseConfigured().
export const isExposureApiConfigured = (): boolean =>
  EXPOSURE_API_CONFIG.baseUrl.length > 0;
