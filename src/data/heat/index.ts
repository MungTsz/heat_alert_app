import { apiHeatProvider } from './apiHeatProvider';
import { HeatDataProvider } from './types';

// API only, by design: heat has no mock provider and no fallback (HKO,
// on-device formula, IDW estimates) — every heat value must be the API's,
// so nothing fake can ever reach the screen. If the API is down the UI
// shows "--".
export const heatDataProvider: HeatDataProvider = apiHeatProvider;

export * from './types';
