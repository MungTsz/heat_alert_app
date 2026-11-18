import { apiAqhiProvider } from './apiAqhiProvider';
import { AqhiDataProvider } from './types';

// API only, by design — same rule as data/heat: there is no mock provider,
// so a made-up AQHI can never reach the screen or a notification. Without
// PRAISE_API_KEY every lookup fails at once (services/praiseApi.ts) and the
// UI shows "--".
export const aqhiDataProvider: AqhiDataProvider = apiAqhiProvider;

export * from './types';
