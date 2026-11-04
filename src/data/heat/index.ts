// import { mockHeatProvider } from './mockHeatProvider'; // 👈 uncomment for offline dev only
import { apiHeatProvider } from './apiHeatProvider';
import { HeatDataProvider } from './types';

// This is the ONLY line you change to switch sources. The API is the single
// source of truth — there's deliberately no automatic fallback to mock/HKO.
export const heatDataProvider: HeatDataProvider = apiHeatProvider;
// export const heatDataProvider: HeatDataProvider = mockHeatProvider;

export * from './types';
