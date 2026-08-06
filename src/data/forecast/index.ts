import { mockForecastProvider } from './mockForecastProvider';
// import { apiForecastProvider } from './apiForecastProvider'; // uncomment when ready

import { ForecastDataProvider } from './types';

export const forecastDataProvider: ForecastDataProvider = mockForecastProvider;
// export const forecastDataProvider: ForecastDataProvider = apiForecastProvider;

export * from './types';
