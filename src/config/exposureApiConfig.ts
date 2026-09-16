import Config from 'react-native-config';

// The local exposure ETL backend (exposure_api_github) — no safe hardcoded
// default is possible since its LAN IP is per-dev-machine, unlike PRAISE's
// fixed public base URLs.
export const EXPOSURE_API_CONFIG = {
  baseUrl: Config.EXPOSURE_API_BASE_URL ?? '',
};

// Lets exposureDataProvider fall back to mock data gracefully when the
// backend URL isn't configured yet, same pattern as isPraiseConfigured().
export const isExposureApiConfigured = (): boolean =>
  EXPOSURE_API_CONFIG.baseUrl.length > 0;
