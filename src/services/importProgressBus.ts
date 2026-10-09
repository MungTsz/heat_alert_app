// src/services/importProgressBus.ts

// Live, in-memory progress of track imports so the Exposure tab can show a
// banner at the top while files are still uploading/processing — and keep
// showing the outcome (incl. per-file errors like "file too large") after
// ImportTrackModal is closed. Module-level registry like heatAlertBus.ts,
// not React context, since the modal and the screen don't share a parent
// that owns import state. Deliberately not persisted: the client-side
// upload+poll loop dies with the app anyway, and a device's own data shows
// up on refresh once the server finishes (see importJobStatusService for the
// persisted per-device marker).

export type ImportFileFailure = { fileName: string; error: string };

export type ImportProgressJob = {
  jobId: string;
  targetLabel: string;
  total: number;
  completed: number;
  failures: ImportFileFailure[];
  finished: boolean;
};

type Listener = () => void;

// Several jobs can overlap: closing the modal mid-import resets it to the
// picker while the previous batch keeps running, so a second batch can start.
let jobs: ImportProgressJob[] = [];
const listeners = new Set<Listener>();

const emit = (next: ImportProgressJob[]) => {
  jobs = next;
  listeners.forEach(listener => listener());
};

const patchJob = (jobId: string, patch: (job: ImportProgressJob) => ImportProgressJob) =>
  emit(jobs.map(job => (job.jobId === jobId ? patch(job) : job)));

export const subscribeImportProgress = (listener: Listener): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

// Returns the same array reference until something changes, as
// useSyncExternalStore requires.
export const getImportProgressJobs = (): ImportProgressJob[] => jobs;

export const startImportProgress = (jobId: string, targetLabel: string, total: number) =>
  emit([
    ...jobs.filter(job => job.jobId !== jobId),
    { jobId, targetLabel, total, completed: 0, failures: [], finished: false },
  ]);

export const reportImportFileResult = (jobId: string, fileName: string, error?: string) =>
  patchJob(jobId, job => ({
    ...job,
    completed: job.completed + 1,
    failures: error ? [...job.failures, { fileName, error }] : job.failures,
  }));

export const finishImportProgress = (jobId: string) =>
  patchJob(jobId, job => ({ ...job, finished: true }));

export const dismissImportProgress = (jobId: string) =>
  emit(jobs.filter(job => job.jobId !== jobId));
