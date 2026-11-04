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
  // /latest only moves once an hour (the pipeline runs hourly), so one
  // lookup is shared by every screen/hook that asks within this window
  // instead of each firing its own request.
  latestTimeCacheMs: 60 * 1000,
  // Hours of heat index shown ahead of "now" on the forecast chart.
  forecastHorizonHours: 48,
  // The API has no forecast yet. Until it does, each future hour shows the
  // observed value from forecastHorizonHours earlier (same time of day, so
  // the daily curve stays realistic) — demo data only. While true, the
  // alert engine skips its forecast-based trend rules so this placeholder
  // never triggers a real push notification. Flip to false once the API
  // serves real forecast data.
  forecastFromHistory: true,
};
