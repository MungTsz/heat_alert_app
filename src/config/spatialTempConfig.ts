import Config from 'react-native-config';

// The Spatial Temperature Estimation API (temperature / humidity /
// heat-index) — the single source of truth for every heat value the app
// shows. No HKO or client-side heat index fallback on purpose: mixing
// sources lets the card, map, chart and push alerts disagree, so when this
// API is unreachable the UI shows "unavailable" instead.
//
// The default is the public deployment; override with SPATIAL_TEMP_API_BASE_URL
// (e.g. http://localhost:8001 behind an SSH tunnel + adb reverse — not 8000,
// which the exposure backend already uses).
export const SPATIAL_TEMP_CONFIG = {
  baseUrl: Config.SPATIAL_TEMP_API_BASE_URL || 'http://hqlx188.ust.hk:8000',
  timeoutMs: Number(Config.SPATIAL_TEMP_API_TIMEOUT_MS) || 20000,
  // Hours of heat index forecast read ahead of "now" — the forecast chart's
  // future half and the alert engine's heads-up window. The API serves
  // about 8 days ahead, so this is a display choice, not an API limit.
  forecastHorizonHours: 48,
};
