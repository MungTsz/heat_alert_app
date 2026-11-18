import { apiAqhiForecastProvider } from './apiAqhiForecastProvider';
import { AqhiForecastProvider } from './types';

// API only, by design (no mock provider) — same rule as data/aqhi. With no
// forecast the chart shows its "not available right now" state.
export const aqhiForecastProvider: AqhiForecastProvider = apiAqhiForecastProvider;

export * from './types';
