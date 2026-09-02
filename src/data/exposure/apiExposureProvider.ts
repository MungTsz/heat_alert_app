import { fetchPraiseExposureList } from '../../services/praiseApi';
import {
  ExposureDataProvider,
  ExposureRequestRow,
  ExposureResultRow,
} from './types';

// The real per-call payload limit for get_exposure_list isn't documented —
// batching client-side is a safe default until confirmed against a live
// server.
const MAX_ROWS_PER_CALL = 200;

const chunk = <T,>(items: T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
};

export const apiExposureProvider: ExposureDataProvider = {
  calculateExposure: async (rows: ExposureRequestRow[]) => {
    const batches = chunk(rows, MAX_ROWS_PER_CALL);
    const results: ExposureResultRow[] = [];

    for (const batch of batches) {
      const response = await fetchPraiseExposureList(batch);
      for (const [recordId, ts, pid, exposure] of response) {
        results.push({ recordId, ts, pid, exposure });
      }
    }

    return results;
  },
};
