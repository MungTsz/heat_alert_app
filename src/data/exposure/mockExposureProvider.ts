import {
  ExposureDataProvider,
  ExposureRequestRow,
  ExposureResultRow,
} from './types';

const MOCK_DELAY_MS = 400;

// Fake %AR-derived exposure: a small base rate per hour with some
// pseudo-random variation, scaled by delta_t — enough to exercise the full
// report/export UI before the real get_exposure_list endpoint is confirmed.
const fakeExposureForRow = (row: ExposureRequestRow): number => {
  const deltaT = row[6];
  const baseRatePerHour = 0.6 + Math.random() * 0.8;
  return Number((baseRatePerHour * deltaT).toFixed(4));
};

export const mockExposureProvider: ExposureDataProvider = {
  calculateExposure: (rows: ExposureRequestRow[]) =>
    new Promise<ExposureResultRow[]>(resolve => {
      setTimeout(() => {
        resolve(
          rows.map(row => ({
            recordId: row[0],
            ts: row[1],
            pid: row[2],
            exposure: fakeExposureForRow(row),
          })),
        );
      }, MOCK_DELAY_MS);
    }),
};
