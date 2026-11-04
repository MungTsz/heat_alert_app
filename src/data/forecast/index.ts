import { apiForecastProvider } from './apiForecastProvider';

import { ForecastDataProvider } from './types';

// API only, by design (no mock provider) — same rule as data/heat. The API's
// forecast is still demo data borrowed from history, see
// SPATIAL_TEMP_CONFIG.forecastFromHistory.
export const forecastDataProvider: ForecastDataProvider = apiForecastProvider;

export * from './types';
