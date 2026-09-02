// import { mockHeatProvider } from './mockHeatProvider'; // 👈 uncomment to go back to mock data
import { apiHeatProvider } from './apiHeatProvider';
import { HeatDataProvider } from './types';

// This is the ONLY line you change to go live:
export const heatDataProvider: HeatDataProvider = apiHeatProvider;
// export const heatDataProvider: HeatDataProvider = mockHeatProvider;

export * from './types';
