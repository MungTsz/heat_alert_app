// src/config/locationConfig.ts
import type { Coordinates } from '../utils/useLocation';

// Where data is looked up when the phone's own position can't be had (GPS
// off, permission denied). One place for it, so every screen and the alert
// engine fall back to the same spot.
export const FALLBACK_CENTER: Coordinates = { latitude: 22.3375, longitude: 114.263 };

// The point to fetch data for, given useLocation()'s state: the real position
// once known, the fallback only after locating has finished without one —
// and null while still locating. Fetching for the fallback during that
// window would flash some other place's numbers (and the character's mood)
// before the user's own.
export const resolveDataCenter = (location: {
  coords: Coordinates | null;
  loading: boolean;
}): Coordinates | null => location.coords ?? (location.loading ? null : FALLBACK_CENTER);
