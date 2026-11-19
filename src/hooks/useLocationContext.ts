// src/hooks/useLocationContext.ts
import { useCallback, useEffect, useState } from 'react';
import { LOCATION_CONTEXT_CONFIG } from '../config/exposureTrackingConfig';
import { DailyActivity } from '../types/alerts';
import { KnownLocationContext, LocationContext, LocationContextSource } from '../types/envi';
import { getRecentFixes, recordCurrentPosition } from '../services/deviceTrackingService';
import {
  readLocationOverride,
  writeLocationOverride,
} from '../services/locationContextStorage';
import {
  ContextPlace,
  Coordinates,
  LOCATION_CONTEXT_LOOKBACK_MS,
  LocationContextOverride,
  LocationFix,
  currentPositionOf,
  isOverrideActive,
  makeOverride,
  resolveLocationContext,
} from '../utils/locationContext';
import { useExposureTrackingSettings } from './useExposureTrackingSettings';

type Options = {
  // Saved places (all indoor), hidden ones included.
  places: readonly ContextPlace[];
  // About you's daily answer — the guess when tracking is off.
  dailyActivity: DailyActivity;
  // Home's own GPS fix, for when tracking has nothing fresher.
  fallbackPosition: Coordinates | null;
};

export type LocationContextState = {
  context: LocationContext;
  source: LocationContextSource;
  trackingOn: boolean;
  // Best known position now (for "Save this place as indoors"); null = none.
  position: Coordinates | null;
  // Set for this stay only; lapses on leaving or at midnight.
  setOverride: (context: KnownLocationContext) => void;
  clearOverride: () => void;
};

// Where the owner is right now, for Home's advice. Components never read
// tracking data themselves: this hook reads the recent positions, judges
// them with utils/locationContext, and keeps the owner's one-tap correction
// for the current stay. Everything stays on the phone.
export const useLocationContext = ({
  places,
  dailyActivity,
  fallbackPosition,
}: Options): LocationContextState => {
  const { enabled: trackingOn, loading: trackingLoading } = useExposureTrackingSettings();
  const [fixes, setFixes] = useState<LocationFix[]>([]);
  const [override, setOverrideState] = useState<LocationContextOverride | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    let active = true;
    readLocationOverride().then(stored => {
      if (active) setOverrideState(stored);
    });
    return () => {
      active = false;
    };
  }, []);

  // Re-judged every refreshSeconds even with tracking off, so a correction
  // still lapses at midnight while Home stays open.
  useEffect(() => {
    if (trackingLoading) return;
    let active = true;
    const refresh = async () => {
      const recent = trackingOn ? await getRecentFixes(LOCATION_CONTEXT_LOOKBACK_MS) : [];
      if (!active) return;
      setFixes(recent);
      setNowMs(Date.now());
    };
    (async () => {
      // The newest stored fix can be a few heartbeats old when Home opens;
      // one fresh fix first means the advice fits where the phone is now.
      if (trackingOn) await recordCurrentPosition();
      await refresh();
    })();
    const timer = setInterval(refresh, LOCATION_CONTEXT_CONFIG.refreshSeconds * 1000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [trackingOn, trackingLoading]);

  const position = currentPositionOf(fixes, fallbackPosition, nowMs);

  // A correction whose stay is over is forgotten for good, so it can't
  // come back when the phone returns to that spot later the same day.
  useEffect(() => {
    if (override && !isOverrideActive(override, position, nowMs)) {
      setOverrideState(null);
      writeLocationOverride(null);
    }
  }, [override, position, nowMs]);

  const setOverride = useCallback(
    (context: KnownLocationContext) => {
      const next = makeOverride(context, position, Date.now());
      setOverrideState(next);
      writeLocationOverride(next);
    },
    [position],
  );

  const clearOverride = useCallback(() => {
    setOverrideState(null);
    writeLocationOverride(null);
  }, []);

  // Until the tracking setting has loaded, nothing is known yet — better
  // general advice for a moment than a guess from the daily answer.
  const resolved = trackingLoading
    ? { context: 'unknown' as const, source: 'none' as const }
    : resolveLocationContext({
        trackingOn,
        fixes,
        places,
        dailyActivity,
        override,
        position,
        nowMs,
      });

  return { ...resolved, trackingOn, position, setOverride, clearOverride };
};
