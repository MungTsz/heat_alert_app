import { ExposureIo } from './exposure';

// A place's category IS the indoor io type the exposure backend assigns to
// stays inside it — derived from ExposureIo rather than redeclared, so the
// two can never drift apart.
export type PlaceCategory = Exclude<ExposureIo, 'Outdoor'>;

export type BookmarkEntry = {
  id: string;
  label: string;
  address: string;
  latitude: number;
  longitude: number;
  category: PlaceCategory;
  // Circle around (latitude, longitude) that counts as this place — sent to
  // the exposure API so nearby places (e.g. Home next to Office) can be told
  // apart.
  radiusMeters: number;
  // Bumped only when a field the place-labels API receives changes
  // (category / position / radius) — drives placeLabelSyncService's diff.
  updatedAt: number;
  // Taken out of the Community watch list (kept in a collapsed "Hidden
  // places" section) — e.g. a place saved from the exposure map only so the
  // backend can classify stays there. Purely a local display preference:
  // the place still syncs as a label and still triggers community alerts,
  // and it's never uploaded, so toggling it must NOT bump updatedAt.
  // Optional so entries stored before it existed need no migration
  // (undefined = shown).
  hidden?: boolean;
};

// The pre-category shape still sitting in AsyncStorage on older installs —
// only read by useBookmarkList's migration.
export type LegacyBookmarkEntry = {
  id: string;
  label: string;
  address: string;
  latitude: number;
  longitude: number;
  type: 'house' | 'place';
};
