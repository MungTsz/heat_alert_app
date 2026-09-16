// src/services/exposureApi.ts
import { EXPOSURE_API_CONFIG } from '../config/exposureApiConfig';
import { ExposureHourlyApiRow, ExposureIngestFeature } from '../types/exposure';

// No documented payload cap for /ingest, but batching keeps any one request
// body/timeout reasonable for a multi-hour import or a long-running live
// track, same rationale as the old PRAISE row-batching.
const MAX_FEATURES_PER_CALL = 500;

const chunk = <T,>(items: T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
};

// Sends a batch of raw pings (either GeoJSON Point features or live-tracking
// pings, mixable in the same batch) to the ETL backend, which does GPS-spike
// rejection, indoor/outdoor dwell classification, and the expo_calx call
// itself server-side.
export const ingestExposurePings = async (
  pid: string,
  features: ExposureIngestFeature[],
): Promise<void> => {
  for (const batch of chunk(features, MAX_FEATURES_PER_CALL)) {
    const response = await fetch(`${EXPOSURE_API_CONFIG.baseUrl}/ingest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pid, features: batch }),
    });
    if (!response.ok) {
      throw new Error(`Exposure ETL /ingest failed (${response.status})`);
    }
  }
};

// Fetches the pid's full ingested history as pre-computed hourly
// indoor/outdoor rows — not date-filtered, so callers slice by
// hour_start_hk's date prefix for a specific day/range.
export const fetchHourlyExposure = async (
  pid: string,
): Promise<ExposureHourlyApiRow[]> => {
  const response = await fetch(
    `${EXPOSURE_API_CONFIG.baseUrl}/exposure/hourly/${encodeURIComponent(pid)}`,
  );
  if (!response.ok) {
    throw new Error(`Exposure ETL /exposure/hourly failed (${response.status})`);
  }
  return response.json();
};
