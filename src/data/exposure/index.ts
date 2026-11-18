import { apiExposureProvider } from './apiExposureProvider';
import { ExposureDataProvider } from './types';

// API only, by design (no mock provider): every exposure number comes from
// the exposure ETL backend. Without EXPOSURE_API_BASE_URL every call fails
// at once (services/exposureApi.ts) and the screens show their empty states.
export const exposureDataProvider: ExposureDataProvider = apiExposureProvider;

export * from './types';
