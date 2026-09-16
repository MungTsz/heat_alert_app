import { fetchHourlyExposure, ingestExposurePings } from '../../services/exposureApi';
import { buildExposureReport } from '../../utils/hourlyExposureAdapter';
import { ExposureDataProvider } from './types';

export const apiExposureProvider: ExposureDataProvider = {
  ingest: (pid, features) => ingestExposurePings(pid, features),
  getHourlyReport: async pid => buildExposureReport(await fetchHourlyExposure(pid)),
};
