// src/services/exposureApi.ts
import { EXPOSURE_API_CONFIG } from '../config/exposureApiConfig';
import { ExposureHourlyApiRow, ExposureIngestFeature } from '../types/exposure';

// react-native's fetch has no request timeout of its own — without this,
// slow ETL calls (see ingestExposurePings below) get cut off by the
// underlying platform networking default instead of EXPOSURE_API_CONFIG.timeoutMs.
const fetchWithTimeout = async (
  input: string,
  init: RequestInit = {},
): Promise<Response> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), EXPOSURE_API_CONFIG.timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
};

// Sends the full set of raw pings (either GeoJSON Point features or
// live-tracking pings, mixable in the same call) to the ETL backend in one
// request, which does GPS-spike rejection, indoor/outdoor dwell
// classification, and the expo_calx call itself server-side.
export const ingestExposurePings = async (
  pid: string,
  features: ExposureIngestFeature[],
): Promise<void> => {
  const response = await fetchWithTimeout(`${EXPOSURE_API_CONFIG.baseUrl}/ingest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pid, features }),
  });
  if (!response.ok) {
    throw new Error(`Exposure ETL /ingest failed (${response.status})`);
  }
};

// Fetches the pid's full ingested history as pre-computed hourly
// indoor/outdoor rows — not date-filtered, so callers slice by
// hour_start_hk's date prefix for a specific day/range.
export const fetchHourlyExposure = async (
  pid: string,
): Promise<ExposureHourlyApiRow[]> => {
  const response = await fetchWithTimeout(
    `${EXPOSURE_API_CONFIG.baseUrl}/exposure/hourly/${encodeURIComponent(pid)}`,
  );
  if (!response.ok) {
    throw new Error(`Exposure ETL /exposure/hourly failed (${response.status})`);
  }
  return response.json();
};
