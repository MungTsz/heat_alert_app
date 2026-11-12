// src/utils/placeStays.ts
import { ExposureSegmentResult } from '../types/exposure';
import { BookmarkEntry } from '../types/bookmark';
import { haversineMeters } from './geoClustering';

const HOUR_MS = 60 * 60 * 1000;

export type TimeInterval = { startMs: number; endMs: number };

// One data hour of either hazard (heat's HourlyHeatIndex, AQHI's
// HourlyAqhi): the hour starting at timestampMs.
export type HourlySample = { timestampMs: number; value: number };

// Today's time at one saved place — where Exposure meets Places.
export type PlaceStay = {
  placeId: string;
  label: string;
  latitude: number;
  longitude: number;
  durationMs: number;
  // Each stay at the place, to pick out the heat index hours inside them.
  intervals: TimeInterval[];
};

// The saved place a stay was at: the nearest one whose circle contains it.
// The same circles the backend labels stays with (radiusMeters), so a stay
// counted at "Home" here is one the exposure map also calls Home.
const placeOf = (
  segment: ExposureSegmentResult,
  places: readonly BookmarkEntry[],
): BookmarkEntry | null => {
  let best: BookmarkEntry | null = null;
  let bestDistance = Infinity;
  for (const place of places) {
    const distance = haversineMeters(segment.lat, segment.lon, place.latitude, place.longitude);
    if (distance <= place.radiusMeters && distance < bestDistance) {
      best = place;
      bestDistance = distance;
    }
  }
  return best;
};

// Stays (not routes) grouped by saved place, longest total first. Hidden
// places count too: hiding only tidies the Places list, and places saved
// just to label exposure stays are usually hidden. Stays outside Hong Kong
// are left out, since neither hazard has data there.
export const summarizePlaceStays = (
  segments: readonly ExposureSegmentResult[],
  places: readonly BookmarkEntry[],
): PlaceStay[] => {
  const byPlace = new Map<string, PlaceStay>();
  for (const segment of segments) {
    // A missing kind is an old row, which was always a stay.
    if (segment.kind === 'route' || !segment.inHk) continue;
    const place = placeOf(segment, places);
    if (!place) continue;
    const stay = byPlace.get(place.id) ?? {
      placeId: place.id,
      label: place.label,
      latitude: place.latitude,
      longitude: place.longitude,
      durationMs: 0,
      intervals: [],
    };
    stay.durationMs += segment.endTime - segment.startTime;
    stay.intervals.push({ startMs: segment.startTime, endMs: segment.endTime });
    byPlace.set(place.id, stay);
  }
  return [...byPlace.values()].sort((a, b) => b.durationMs - a.durationMs);
};

// The highest API value among the data hours that overlap a stay — a pick
// from the API's own numbers, never an estimate. null when none of those
// hours has data yet (heat data lands 1-2 h late).
export const maxDuringIntervals = (
  series: readonly HourlySample[],
  intervals: readonly TimeInterval[],
): number | null => {
  const values = series
    .filter(hour =>
      intervals.some(
        ({ startMs, endMs }) => hour.timestampMs < endMs && hour.timestampMs + HOUR_MS > startMs,
      ),
    )
    .map(hour => hour.value);
  return values.length > 0 ? Math.max(...values) : null;
};
