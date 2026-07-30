import { mockHeatProvider } from './mockHeatProvider';
// import { apiHeatProvider } from './apiHeatProvider'; // 👈 uncomment when backend is ready
import { HeatDataProvider } from './types';

// This is the ONLY line you change to go live:
export const heatDataProvider: HeatDataProvider = mockHeatProvider;
// export const heatDataProvider: HeatDataProvider = apiHeatProvider;

export * from './types';
