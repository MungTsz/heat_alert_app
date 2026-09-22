import Config from 'react-native-config';

export const ROUTES_API_CONFIG = {
  apiKey: Config.GOOGLE_ROUTES_API_KEY ?? '',
  timeoutMs: Number(Config.GOOGLE_ROUTES_API_TIMEOUT_MS) || 10000,
};

// A separate key from GOOGLE_ANDROID_MAP_KEY: this one is called via a plain
// fetch() from JS (Routes API), so it can't rely on the native Maps SDK's
// package/SHA-1 app-restriction attestation. When absent, callers fall back
// to the existing straight-line trajectory rendering.
export const isRoutesApiConfigured = (): boolean =>
  ROUTES_API_CONFIG.apiKey.length > 0;
