import { fetchPraiseExposureCalc } from '../../services/praiseApi';
import {
  ExposureDataProvider,
  ExposureRequestRow,
  ExposureResultRow,
} from './types';

// expo_calx is a GET with rows embedded in the input_data query string, so
// batch size is bounded by URL-length limits rather than a documented
// payload cap. Starting conservative until verified against the live
// server with real-sized batches.
const MAX_ROWS_PER_CALL = 40;

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
      const response = await fetchPraiseExposureCalc(batch);
      for (const [ts, pid, exposure] of response.exposure) {
        results.push({ ts, pid, exposure });
      }
    }

    return results;
  },
};
