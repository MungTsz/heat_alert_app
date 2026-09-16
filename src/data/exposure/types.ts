import { ExposureIngestFeature, ExposureReport } from '../../types/exposure';

export interface ExposureDataProvider {
  ingest: (pid: string, features: ExposureIngestFeature[]) => Promise<void>;
  getHourlyReport: (pid: string) => Promise<ExposureReport>;
}

export type { ExposureIngestFeature, ExposureReport };
