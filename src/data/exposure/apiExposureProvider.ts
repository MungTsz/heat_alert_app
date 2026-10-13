import {
  deleteExposureDay,
  fetchHourlyExposure,
  ingestExposureGpx,
  ingestExposurePings,
  waitForIngestBatch,
} from '../../services/exposureApi';
import { buildExposureReport } from '../../utils/hourlyExposureAdapter';
import { ExposureDataProvider, ExposureIngestResult } from './types';

// /ingest only queues a background job now — wait for it here so callers
// keep the "ingest resolved ⇒ getHourlyReport has the new rows" contract.
// The batch's own row count is used rather than getHourlyReport's, since
// that returns the pid's whole history (earlier imports included).
const waitForResult = async (batchId: number): Promise<ExposureIngestResult> => {
  const batch = await waitForIngestBatch(batchId);
  return { processedRows: batch.rows ?? null };
};

export const apiExposureProvider: ExposureDataProvider = {
  ingest: async (pid, features) => waitForResult(await ingestExposurePings(pid, features)),
  ingestGpx: async (pid, gpxText) => waitForResult(await ingestExposureGpx(pid, gpxText)),
  getHourlyReport: async pid => buildExposureReport(await fetchHourlyExposure(pid)),
  deleteDay: deleteExposureDay,
};
