import { mockExposureProvider } from './mockExposureProvider';
import { apiExposureProvider } from './apiExposureProvider';
import { isExposureApiConfigured } from '../../config/exposureApiConfig';
import { ExposureDataProvider } from './types';

// Switches to the local exposure ETL backend once EXPOSURE_API_BASE_URL is
// set, the same way aqhi/aqhiForecast auto-switch on their own config.
export const exposureDataProvider: ExposureDataProvider = isExposureApiConfigured()
  ? apiExposureProvider
  : mockExposureProvider;

// Lets the UI show a "mock data" indicator without hardcoding that
// assumption in components — flip together with exposureDataProvider above.
export const isExposureDataMocked = exposureDataProvider === mockExposureProvider;

export * from './types';
