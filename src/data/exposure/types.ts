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
  // Removes one HK-local day (YYYY-MM-DD) of the pid's data so it can be
  // imported again from scratch.
  deleteDay: (pid: string, dateKey: string) => Promise<void>;
}

export type { ExposureIngestFeature, ExposureIngestResult, ExposureReport };
