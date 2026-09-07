import { mockExposureProvider } from './mockExposureProvider';
import { apiExposureProvider } from './apiExposureProvider';
import { isPraiseConfigured } from '../../config/praiseConfig';
import { ExposureDataProvider } from './types';

// expo_calx (src/services/praiseApi.ts: fetchPraiseExposureCalc) was
// confirmed working live on 2026-09-07, so exposure now auto-switches on
// PRAISE_API_KEY the same way aqhi/aqhiForecast already do.
export const exposureDataProvider: ExposureDataProvider = isPraiseConfigured()
  ? apiExposureProvider
  : mockExposureProvider;

// Lets the UI show a "mock data" indicator without hardcoding that
// assumption in components — flip together with exposureDataProvider above.
export const isExposureDataMocked = exposureDataProvider === mockExposureProvider;

export * from './types';
