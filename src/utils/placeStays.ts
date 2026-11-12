// src/utils/placeStays.ts
import { ExposureSegmentResult } from '../types/exposure';
import { BookmarkEntry } from '../types/bookmark';
import { haversineMeters } from './geoClustering';

// Today's exposure at one saved place — where Exposure meets Places.
export type PlaceStay = {
  placeId: string;
  label: string;
  durationMs: number;
  // %AR·h, the same unit and the same per-row values as the day's total.
  exposure: number;
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

// Stays (not routes) grouped by saved place, highest exposure first. Hidden
// places count too: hiding only tidies the Places list, and places saved
// just to label exposure stays are usually hidden. Rows outside Hong Kong
// are never scored, and a non-positive value is the backend's "couldn't
// score this row" — both are left out, as in the day's total, and a place
// with nothing scored isn't listed at all.
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
      durationMs: 0,
      exposure: 0,
    };
    stay.durationMs += segment.endTime - segment.startTime;
    if (segment.exposure > 0) stay.exposure += segment.exposure;
    byPlace.set(place.id, stay);
  }
  return [...byPlace.values()]
    .filter(stay => stay.exposure > 0)
    .sort((a, b) => b.exposure - a.exposure);
};
