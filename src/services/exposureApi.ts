// src/services/exposureApi.ts
import { EXPOSURE_API_CONFIG } from '../config/exposureApiConfig';
import { fetchWithTimeout as fetchWithTimeoutMs } from '../utils/fetchWithTimeout';
import { PlaceLabel } from '../data/placeLabels/types';
import {
  ExposureBatchStatus,
  ExposureHourlyApiRow,
  ExposureIngestAccepted,
  ExposureIngestFeature,
} from '../types/exposure';

// Every exposure-backend call shares one timeout — long, since /ingest
// uploads can be large.
const fetchWithTimeout = (input: string, init: RequestInit = {}): Promise<Response> =>
  fetchWithTimeoutMs(input, init, EXPOSURE_API_CONFIG.timeoutMs);

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
  `File is too large to upload (limit ${formatMb(limitBytes)}). Split it into smaller files, e.g. half a day each.`;

const NO_VALID_PINGS_MESSAGE = 'No valid GPS points found in that file.';
// The server doesn't check it, but the API doc asks for it on /ingest/gpx.
const GPX_CONTENT_TYPE = 'application/gpx+xml';
// /ingest/gpx answers 400 both for unparseable XML and for a file with no
// usable <trkpt>; only the former's detail starts with this prefix.
const INVALID_GPX_DETAIL_PREFIX = 'invalid gpx';

// Shared by every ingest endpoint so the size pre-check and error → message
// mapping stay in one place. Returns the queued batch_id. `map400` lets each
// endpoint word its own 400s (the GPX one has two distinct causes).
const postIngestBody = async (
  url: string,
  body: string,
  contentType: string,
  map400: (detail: string | null) => string,
): Promise<number> => {
  if (utf8ByteLength(body) > EXPOSURE_API_CONFIG.maxIngestBodyBytes) {
    throw new ExposureApiError(tooLargeMessage(EXPOSURE_API_CONFIG.maxIngestBodyBytes), 413);
  }
  const response = await fetchWithTimeout(url, {
    method: 'POST',
    headers: { 'Content-Type': contentType },
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
      throw new ExposureApiError(map400(detail), 400);
    }
    throw new ExposureApiError(
      `Upload failed (${response.status})${detail ? `: ${detail}` : ''}`,
      response.status,
    );
  }
  const accepted: ExposureIngestAccepted = await response.json();
  return accepted.batch_id;
};

// Sends the raw pings (GeoJSON Point features and/or live-tracking pings) to
// the ETL backend. The server only validates and stores them here, answering
// 202 with a batch_id; the pipeline itself runs as a background job — see
// waitForIngestBatch.
export const ingestExposurePings = (
  pid: string,
  features: ExposureIngestFeature[],
): Promise<number> =>
  postIngestBody(
    `${EXPOSURE_API_CONFIG.baseUrl}/ingest`,
    JSON.stringify({ pid, features }),
    'application/json',
    () => NO_VALID_PINGS_MESSAGE,
  );

// Uploads a whole GPX file as-is — the server reads every <trkpt> itself, so
// the app never parses the XML. Otherwise identical to ingestExposurePings:
// same 202 + batch_id, same background job.
export const ingestExposureGpx = (pid: string, gpxText: string): Promise<number> =>
  postIngestBody(
    `${EXPOSURE_API_CONFIG.baseUrl}/ingest/gpx?pid=${encodeURIComponent(pid)}`,
    gpxText,
    GPX_CONTENT_TYPE,
    detail =>
      detail?.toLowerCase().startsWith(INVALID_GPX_DETAIL_PREFIX)
        ? 'Not a readable GPX file.'
        : NO_VALID_PINGS_MESSAGE,
  );

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

const DAY_BUSY_MESSAGE =
  "This day's import is still processing — try again once it's finished.";

// Deletes one HK-local day (YYYY-MM-DD) of the pid's rows. The backend also
// cuts that day out of the uploads it keeps for place-label re-runs, so the
// day doesn't come back later on its own; re-importing a file for the day
// is how it comes back. A day with no data is a 200 too (0 rows), so a
// retried delete is harmless.
export const deleteExposureDay = async (pid: string, dateKey: string): Promise<void> => {
  const response = await fetchWithTimeout(
    `${EXPOSURE_API_CONFIG.baseUrl}/exposure/hourly/${encodeURIComponent(pid)}?date=${encodeURIComponent(dateKey)}`,
    { method: 'DELETE' },
  );
  if (response.status === 409) {
    throw new ExposureApiError(DAY_BUSY_MESSAGE, 409);
  }
  if (!response.ok) {
    const detail = await readErrorDetail(response);
    throw new ExposureApiError(
      `Deleting the day failed (${response.status})${detail ? `: ${detail}` : ''}`,
      response.status,
    );
  }
};

const placeLabelUrl = (labelId: string): string =>
  `${EXPOSURE_API_CONFIG.baseUrl}/place-labels/${encodeURIComponent(labelId)}`;

// Idempotent create-or-update of one crowd-sourced place label. Only the
// category and circle are sent — never the user's name for the place or its
// address.
export const upsertPlaceLabel = async (label: PlaceLabel): Promise<void> => {
  const response = await fetchWithTimeout(placeLabelUrl(label.labelId), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contributor_id: label.contributorId,
      category: label.category,
      lat: label.latitude,
      lng: label.longitude,
      radius_m: label.radiusMeters,
      updated_at: new Date(label.updatedAt).toISOString(),
    }),
  });
  if (!response.ok) {
    const detail = await readErrorDetail(response);
    throw new ExposureApiError(
      `Place label upload failed (${response.status})${detail ? `: ${detail}` : ''}`,
      response.status,
    );
  }
};

// 404 counts as success: the goal is "this label no longer exists", and a
// retried delete (or one for a label whose upload never landed) hits it.
export const deletePlaceLabel = async (labelId: string, contributorId: string): Promise<void> => {
  const response = await fetchWithTimeout(
    `${placeLabelUrl(labelId)}?contributor_id=${encodeURIComponent(contributorId)}`,
    { method: 'DELETE' },
  );
  if (!response.ok && response.status !== 404) {
    const detail = await readErrorDetail(response);
    throw new ExposureApiError(
      `Place label delete failed (${response.status})${detail ? `: ${detail}` : ''}`,
      response.status,
    );
  }
};
