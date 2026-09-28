// src/hooks/useImportJobStatus.ts
import { useCallback, useEffect, useRef, useState } from 'react';
import { getImportJobStatus, ImportJobStatus } from '../services/importJobStatusService';

// Matches the "while this screen is open" poll cadence used elsewhere
// (useTodayExposure, HeatAlertEngine), just shorter — this needs to feel
// responsive since it's the only signal that a background import is alive.
const POLL_INTERVAL_MS = 5000;

// Polls the persisted "still processing" marker for a device import batch.
// onJobComplete fires once when a previously-active job disappears, so
// callers can refresh their own data without the user pulling to refresh.
export const useImportJobStatus = (deviceId: string, onJobComplete?: () => void) => {
  const [status, setStatus] = useState<ImportJobStatus | null>(null);
  const wasActiveRef = useRef(false);
  const onJobCompleteRef = useRef(onJobComplete);
  onJobCompleteRef.current = onJobComplete;

  const refresh = useCallback(async () => {
    const next = await getImportJobStatus(deviceId);
    setStatus(next);
    if (wasActiveRef.current && !next) onJobCompleteRef.current?.();
    wasActiveRef.current = !!next;
  }, [deviceId]);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [refresh]);

  return { status };
};
