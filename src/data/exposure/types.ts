import {
  ExposureIngestFeature,
  ExposureIngestResult,
  ExposureReport,
} from '../../types/exposure';

export interface ExposureDataProvider {
  ingest: (pid: string, features: ExposureIngestFeature[]) => Promise<ExposureIngestResult>;
  getHourlyReport: (pid: string) => Promise<ExposureReport>;
}

export type { ExposureIngestFeature, ExposureIngestResult, ExposureReport };
