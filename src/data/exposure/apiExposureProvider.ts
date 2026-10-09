import {
  fetchHourlyExposure,
  ingestExposurePings,
  waitForIngestBatch,
} from '../../services/exposureApi';
import { buildExposureReport } from '../../utils/hourlyExposureAdapter';
import { ExposureDataProvider } from './types';

export const apiExposureProvider: ExposureDataProvider = {
  // /ingest only queues a background job now — wait for it here so callers
  // keep the "ingest resolved ⇒ getHourlyReport has the new rows" contract.
  ingest: async (pid, features) => {
    const batchId = await ingestExposurePings(pid, features);
    await waitForIngestBatch(batchId);
  },
  getHourlyReport: async pid => buildExposureReport(await fetchHourlyExposure(pid)),
};
