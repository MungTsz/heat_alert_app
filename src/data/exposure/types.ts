import {
  ExposureIngestFeature,
  ExposureIngestResult,
  ExposureReport,
} from '../../types/exposure';

export interface ExposureDataProvider {
  ingest: (pid: string, features: ExposureIngestFeature[]) => Promise<ExposureIngestResult>;
  // Raw GPX file text, uploaded as-is — the backend parses the <trkpt>s.
  ingestGpx: (pid: string, gpxText: string) => Promise<ExposureIngestResult>;
  getHourlyReport: (pid: string) => Promise<ExposureReport>;
}

export type { ExposureIngestFeature, ExposureIngestResult, ExposureReport };
