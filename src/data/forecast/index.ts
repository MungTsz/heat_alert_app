// import { mockForecastProvider } from './mockForecastProvider'; // 👈 uncomment for offline dev only
import { apiForecastProvider } from './apiForecastProvider';

import { ForecastDataProvider } from './types';

// Live on the spatial temperature API (single source of truth). Its forecast
// is still demo data borrowed from history — see
// SPATIAL_TEMP_CONFIG.forecastFromHistory.
export const forecastDataProvider: ForecastDataProvider = apiForecastProvider;
// export const forecastDataProvider: ForecastDataProvider = mockForecastProvider;

export * from './types';
