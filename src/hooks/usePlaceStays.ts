// src/hooks/usePlaceStays.ts
import { useEffect, useMemo, useState } from 'react';
import { ExposureReport } from '../types/exposure';
import { HazardKind } from '../types/alerts';
import { heatDataProvider } from '../data/heat';
import { aqhiDataProvider } from '../data/aqhi';
import { HAZARD_KINDS } from '../config/alertConfig';
import { EXPOSURE_PLACE_STAYS_CONFIG } from '../config/exposureScreenConfig';
import {
  HourlySample,
  PlaceStay,
  maxDuringIntervals,
  summarizePlaceStays,
} from '../utils/placeStays';
import { useBookmarkList } from './useBookmarkList';

type Coordinates = { latitude: number; longitude: number };

// Each hazard's own provider — heat from the Spatial Temperature API, AQHI
// from PRAISE (mock without it, as everywhere else AQHI is shown) — at the
// place's own coordinates, never estimated on the phone.
const HISTORY_LOOKUP: Record<
  HazardKind,
  (coords: Coordinates, fromMs: number, toMs: number) => Promise<HourlySample[]>
> = {
  heat: heatDataProvider.getHeatIndexHistoryAt,
  aqhi: aqhiDataProvider.getAqhiHistoryAt,
};

// Highest value per hazard during the stays; null = loading, failed, or no
// data for those hours yet → "--".
export type StayPeaks = Record<HazardKind, number | null>;

export type PlaceStaySummary = {
  placeId: string;
  label: string;
  durationMs: number;
  peaks: StayPeaks;
};

const fetchPeak = async (stay: PlaceStay, hazard: HazardKind): Promise<number | null> => {
  const fromMs = Math.min(...stay.intervals.map(i => i.startMs));
  const toMs = Math.max(...stay.intervals.map(i => i.endMs));
  try {
    const series = await HISTORY_LOOKUP[hazard](stay, fromMs, toMs);
    const peak = maxDuringIntervals(series, stay.intervals);
    return peak === null ? null : Math.round(peak);
  } catch (err) {
    console.log(`Stay ${hazard} fetch error for ${stay.placeId}:`, err);
    return null;
  }
};

const NO_PEAKS: StayPeaks = { heat: null, aqhi: null };

// Today's time at each saved place, with the highest heat index and AQHI
// while the user was there — the line that ties Exposure to Places and to
// the app's hazard colors. Both hazards side by side, as peers.
export const usePlaceStays = (report: ExposureReport | null): PlaceStaySummary[] => {
  const { bookmarks } = useBookmarkList();
  const stays = useMemo(
    () =>
      report
        ? summarizePlaceStays(report.segments, bookmarks).slice(
            0,
            EXPOSURE_PLACE_STAYS_CONFIG.maxPlaces,
          )
        : [],
    [report, bookmarks],
  );
  const [peaksById, setPeaksById] = useState<Record<string, StayPeaks>>({});

  // The report is rebuilt on every poll; only refetch when the stays
  // themselves changed.
  const staysKey = stays.map(s => `${s.placeId}:${s.intervals.length}:${s.durationMs}`).join('|');

  useEffect(() => {
    if (stays.length === 0) {
      setPeaksById({});
      return;
    }
    let isMounted = true;
    Promise.all(
      stays.map(async stay => {
        const values = await Promise.all(HAZARD_KINDS.map(hazard => fetchPeak(stay, hazard)));
        const peaks = Object.fromEntries(
          HAZARD_KINDS.map((hazard, i) => [hazard, values[i]]),
        ) as StayPeaks;
        return [stay.placeId, peaks] as const;
      }),
    ).then(results => {
      if (isMounted) setPeaksById(Object.fromEntries(results));
    });
    return () => {
      isMounted = false;
    };
    // stays is derived from report/bookmarks; staysKey captures what matters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [staysKey]);

  return stays.map(stay => ({
    placeId: stay.placeId,
    label: stay.label,
    durationMs: stay.durationMs,
    peaks: peaksById[stay.placeId] ?? NO_PEAKS,
  }));
};
