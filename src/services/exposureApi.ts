// src/services/exposureApi.ts
import { EXPOSURE_API_CONFIG } from '../config/exposureApiConfig';
import {
  ExposureBatchStatus,
  ExposureHourlyApiRow,
  ExposureIngestAccepted,
  ExposureIngestFeature,
} from '../types/exposure';

// react-native's fetch has no request timeout of its own — without this,
// slow uploads get cut off by the underlying platform networking default
// instead of EXPOSURE_API_CONFIG.timeoutMs.
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

const BYTES_PER_MB = 1024 * 1024;
const formatMb = (bytes: number): string => `${(bytes / BYTES_PER_MB).toFixed(1)} MB`;

// Carries the HTTP status so callers can tell "fix/split the file" (4xx)
// apart from transient failures, while `message` is already user-facing.
export class ExposureApiError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = 'ExposureApiError';
    this.status = status;
  }
}

// Every backend error body is JSON with a `detail` field — a string, or
// (for 422) a list of pydantic validation items.
const readErrorDetail = async (response: Response): Promise<string | null> => {
  try {
    const body = await response.json();
    if (typeof body?.detail === 'string') return body.detail;
    if (Array.isArray(body?.detail)) {
      return body.detail.map((d: { msg?: string }) => d.msg).filter(Boolean).join('; ');
    }
  } catch {
    // Non-JSON body (e.g. a proxy error page) — fall through to the status text.
  }
  return null;
};

// UTF-8 byte length without Blob/TextEncoder (neither is reliable across RN
// engines) — the server's limit is on bytes, and GeoJSON can contain
// non-ASCII property strings.
const utf8ByteLength = (str: string): number => {
  let bytes = 0;
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    if (code < 0x80) bytes += 1;
    else if (code < 0x800) bytes += 2;
    else if (code >= 0xd800 && code <= 0xdbff) {
      bytes += 4; // surrogate pair → one 4-byte code point
      i++;
    } else bytes += 3;
  }
  return bytes;
};

const tooLargeMessage = (limitBytes: number): string =>
  `File is too large to upload (limit ${formatMb(limitBytes)}). Split it into smaller files, e.g. one day each.`;

// Sends the raw pings (GeoJSON Point features and/or live-tracking pings) to
// the ETL backend. The server only validates and stores them here, answering
// 202 with a batch_id; the pipeline itself runs as a background job — see
// waitForIngestBatch.
export const ingestExposurePings = async (
  pid: string,
  features: ExposureIngestFeature[],
): Promise<number> => {
  const body = JSON.stringify({ pid, features });
  if (utf8ByteLength(body) > EXPOSURE_API_CONFIG.maxIngestBodyBytes) {
    throw new ExposureApiError(tooLargeMessage(EXPOSURE_API_CONFIG.maxIngestBodyBytes), 413);
  }
  const response = await fetchWithTimeout(`${EXPOSURE_API_CONFIG.baseUrl}/ingest`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
  if (!response.ok) {
    const detail = await readErrorDetail(response);
    if (response.status === 413) {
      // The server's limit may differ from our mirrored default (it's
      // configurable there), so trust its own number when it gives one.
      const serverLimit = Number(detail?.match(/(\d+)\s*bytes/)?.[1]);
      throw new ExposureApiError(
        tooLargeMessage(serverLimit || EXPOSURE_API_CONFIG.maxIngestBodyBytes),
        413,
      );
    }
    if (response.status === 400) {
      throw new ExposureApiError('No valid GPS points found in that file.', 400);
    }
    throw new ExposureApiError(
      `Upload failed (${response.status})${detail ? `: ${detail}` : ''}`,
      response.status,
    );
  }
  const accepted: ExposureIngestAccepted = await response.json();
  return accepted.batch_id;
};

export const fetchIngestBatch = async (batchId: number): Promise<ExposureBatchStatus> => {
  const response = await fetchWithTimeout(`${EXPOSURE_API_CONFIG.baseUrl}/ingest/${batchId}`);
  if (!response.ok) {
    const detail = await readErrorDetail(response);
    throw new ExposureApiError(
      `Could not check processing status (${response.status})${detail ? `: ${detail}` : ''}`,
      response.status,
    );
  }
  return response.json();
};

const delay = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

// Polls a batch until the background job finishes. The server runs at most
// a fixed number of expo_calx calls at once across ALL batches, so a batch
// can sit in pending/processing for a while when several are queued — hence
// the long ceiling. A failed batch stores none of its rows, so it surfaces
// as an error the user can retry by re-uploading.
export const waitForIngestBatch = async (batchId: number): Promise<ExposureBatchStatus> => {
  const deadline = Date.now() + EXPOSURE_API_CONFIG.batchMaxWaitMs;
  for (;;) {
    const batch = await fetchIngestBatch(batchId);
    if (batch.status === 'done') return batch;
    if (batch.status === 'error') {
      throw new ExposureApiError(
        `Server failed to process this upload${batch.error_detail ? ` (${batch.error_detail})` : ''}. Please try uploading it again later.`,
      );
    }
    if (Date.now() >= deadline) {
      throw new ExposureApiError(
        'Server is still processing this upload (it may be busy with other jobs). Check back later.',
      );
    }
    await delay(EXPOSURE_API_CONFIG.batchPollIntervalMs);
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
    throw new ExposureApiError(
      `Exposure ETL /exposure/hourly failed (${response.status})`,
      response.status,
    );
  }
  return response.json();
};
