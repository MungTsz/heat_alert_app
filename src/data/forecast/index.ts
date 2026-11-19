import { apiForecastProvider } from './apiForecastProvider';

import { ForecastDataProvider } from './types';

// API only, by design (no mock provider) — same rule as data/heat. Future
// hours are the Spatial Temperature API's own forecast.
export const forecastDataProvider: ForecastDataProvider = apiForecastProvider;

export * from './types';
