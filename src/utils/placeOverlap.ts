// src/utils/placeOverlap.ts
import { PLACE_LABEL_CONFIG } from '../config/placeLabelConfig';
import { BookmarkEntry, PlaceCategory } from '../types/bookmark';
import { haversineMeters } from './geoClustering';

const METERS_PER_DEGREE_LAT = 111320;

export type PlaceCircle = {
  latitude: number;
  longitude: number;
  radiusMeters: number;
  category: PlaceCategory;
};

export type PlaceConflict = {
  place: BookmarkEntry;
  distanceM: number;
  // Largest step-aligned radius that clears this place's circle, or null when
  // even the minimum radius still overlaps (e.g. Home and Office in the same
  // building) — the two can't be separated by shrinking alone.
  maxNonOverlappingRadiusM: number | null;
};

// Rounds onto the slider's grid and into its allowed range.
export const snapRadius = (radiusM: number): number => {
  const { minM, maxM, stepM } = PLACE_LABEL_CONFIG.radius;
  return Math.min(maxM, Math.max(minM, Math.round(radiusM / stepM) * stepM));
};

// Places of a DIFFERENT category whose circle overlaps the candidate's — a
// stay in the overlap couldn't be attributed to either. Same-category
// overlaps are harmless (both say e.g. "Office"), so they're not reported.
export const findConflictingPlaces = (
  candidate: PlaceCircle,
  places: readonly BookmarkEntry[],
): PlaceConflict[] => {
  const { minM, stepM } = PLACE_LABEL_CONFIG.radius;
  const tolerance = PLACE_LABEL_CONFIG.overlapToleranceM;
  return places
    .filter(place => place.category !== candidate.category)
    .map(place => ({
      place,
      distanceM: haversineMeters(
        candidate.latitude,
        candidate.longitude,
        place.latitude,
        place.longitude,
      ),
    }))
    .filter(
      ({ place, distanceM }) =>
        distanceM + tolerance < candidate.radiusMeters + place.radiusMeters,
    )
    .map(({ place, distanceM }) => {
      // Floor (not round) so the shrunk circle really stops short of the other.
      const fit = Math.floor((distanceM - place.radiusMeters + tolerance) / stepM) * stepM;
      return { place, distanceM, maxNonOverlappingRadiusM: fit >= minM ? fit : null };
    })
    .sort((a, b) => a.distanceM - b.distanceM);
};

// Map span that frames a circle of this radius with some surroundings — the
// longitude span is widened by 1/cos(lat) so the circle looks round, not
// squashed, on the Mercator map.
export const radiusToRegionDelta = (
  radiusM: number,
  latitude: number,
): { latitudeDelta: number; longitudeDelta: number } => {
  const { previewPaddingFactor, minPreviewDeltaDeg } = PLACE_LABEL_CONFIG;
  const latitudeDelta = Math.max(
    minPreviewDeltaDeg,
    (radiusM * 2 * previewPaddingFactor) / METERS_PER_DEGREE_LAT,
  );
  return {
    latitudeDelta,
    longitudeDelta: latitudeDelta / Math.cos((latitude * Math.PI) / 180),
  };
};
