import { findConflictingPlaces, radiusToRegionDelta, snapRadius } from '../placeOverlap';
import { BookmarkEntry } from '../../types/bookmark';

// Matches haversineMeters' 6371 km Earth radius (2πR / 360).
const METERS_PER_DEGREE_LAT = 111195;
const ORIGIN = { latitude: 22.3, longitude: 114.17 };

// A place `metersNorth` of ORIGIN — moving along a meridian keeps the
// distance math trivial to reason about.
const placeNorth = (
  metersNorth: number,
  overrides: Partial<BookmarkEntry> = {},
): BookmarkEntry => ({
  id: `p-${metersNorth}`,
  label: `Place ${metersNorth}`,
  address: '',
  latitude: ORIGIN.latitude + metersNorth / METERS_PER_DEGREE_LAT,
  longitude: ORIGIN.longitude,
  category: 'Home',
  radiusMeters: 25,
  updatedAt: 0,
  ...overrides,
});

describe('findConflictingPlaces', () => {
  const candidate = { ...ORIGIN, radiusMeters: 25, category: 'Office' as const };

  it('reports an overlapping place of another category with a radius that clears it', () => {
    const [conflict] = findConflictingPlaces(candidate, [placeNorth(40)]);
    expect(conflict.place.id).toBe('p-40');
    expect(conflict.distanceM).toBeCloseTo(40, 0);
    // 40 m apart − its 25 m radius = 15 m, already on the 5 m grid.
    expect(conflict.maxNonOverlappingRadiusM).toBe(15);
  });

  it('ignores same-category overlaps and places that are far enough away', () => {
    expect(findConflictingPlaces(candidate, [placeNorth(40, { category: 'Office' })])).toEqual([]);
    expect(findConflictingPlaces(candidate, [placeNorth(60)])).toEqual([]);
  });

  it('says the places cannot be separated when even the minimum radius overlaps', () => {
    const [conflict] = findConflictingPlaces(candidate, [placeNorth(5)]);
    expect(conflict.maxNonOverlappingRadiusM).toBeNull();
  });

  it('lists the nearest conflict first', () => {
    const conflicts = findConflictingPlaces(candidate, [placeNorth(45), placeNorth(30)]);
    expect(conflicts.map(c => c.place.id)).toEqual(['p-30', 'p-45']);
  });
});

describe('snapRadius', () => {
  it('rounds onto the 5 m grid within 10–200 m', () => {
    expect(snapRadius(23)).toBe(25);
    expect(snapRadius(2)).toBe(10);
    expect(snapRadius(999)).toBe(200);
  });
});

describe('radiusToRegionDelta', () => {
  it('widens the longitude span so the circle stays round', () => {
    const delta = radiusToRegionDelta(200, ORIGIN.latitude);
    expect(delta.longitudeDelta).toBeGreaterThan(delta.latitudeDelta);
  });

  it('never zooms in past the minimum span', () => {
    expect(radiusToRegionDelta(10, ORIGIN.latitude).latitudeDelta).toBe(0.0015);
  });
});
