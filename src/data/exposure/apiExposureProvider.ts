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
  // The batch's own row count is used rather than getHourlyReport's, since
  // that returns the pid's whole history (earlier imports included).
  ingest: async (pid, features) => {
    const batchId = await ingestExposurePings(pid, features);
    const batch = await waitForIngestBatch(batchId);
    return { processedRows: batch.rows ?? null };
  },
  getHourlyReport: async pid => buildExposureReport(await fetchHourlyExposure(pid)),
};
