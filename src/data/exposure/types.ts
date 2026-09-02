import { ExposureRequestRow, ExposureResultRow } from '../../types/exposure';

export interface ExposureDataProvider {
  calculateExposure: (
    rows: ExposureRequestRow[],
  ) => Promise<ExposureResultRow[]>;
}

export type { ExposureRequestRow, ExposureResultRow };
