// src/services/importJobStatusService.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

// There's no real backend job-ID/polling API for imports (see
// exposureApiConfig.ts) — this is a client-side stand-in that lets the UI
// know "an import batch for this device is still processing" across modal
// closes, screen navigation, and app restarts, since none of those should
// make a still-running import look like it failed.
export type ImportJobStatus = {
  jobId: string;
  total: number;
  completed: number;
  startedAt: number;
  // Bumped on every write, including the first — staleness is judged off
  // this, not startedAt, so a long-but-genuinely-still-running batch never
  // gets mistaken for an abandoned one (see getImportJobStatus).
  updatedAt: number;
};

const KEY_PREFIX = 'exposure_import_job:';
const keyFor = (deviceId: string): string => `${KEY_PREFIX}${deviceId}`;

// Ceiling for an abandoned job — a crashed or force-quit app skips our own
// clearImportJobStatus call, which would otherwise leave a permanently
// "processing" device. Judged against updatedAt, so it only fires once
// progress writes actually stop.
const MAX_JOB_AGE_MS = 60 * 60 * 1000;

export const setImportJobStatus = async (
  deviceId: string,
  status: ImportJobStatus,
): Promise<void> => {
  try {
    await AsyncStorage.setItem(keyFor(deviceId), JSON.stringify(status));
  } catch (error) {
    console.log('Failed to persist import job status:', error);
  }
};

const readRaw = async (deviceId: string): Promise<ImportJobStatus | null> => {
  try {
    const raw = await AsyncStorage.getItem(keyFor(deviceId));
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.log('Failed to read import job status:', error);
    return null;
  }
};

// Compare-and-clear: only removes the record if it still belongs to this
// jobId, so a late-finishing stale batch (e.g. the modal was reopened and a
// second batch confirmed before an earlier closed-but-still-running one
// finished) can't wipe out a newer batch's active marker for the same device.
export const clearImportJobStatus = async (deviceId: string, jobId: string): Promise<void> => {
  try {
    const current = await readRaw(deviceId);
    if (current && current.jobId !== jobId) return;
    await AsyncStorage.removeItem(keyFor(deviceId));
  } catch (error) {
    console.log('Failed to clear import job status:', error);
  }
};

export const getImportJobStatus = async (deviceId: string): Promise<ImportJobStatus | null> => {
  const status = await readRaw(deviceId);
  if (!status) return null;
  if (Date.now() - status.updatedAt > MAX_JOB_AGE_MS) {
    await AsyncStorage.removeItem(keyFor(deviceId)).catch(() => {});
    return null;
  }
  return status;
};
