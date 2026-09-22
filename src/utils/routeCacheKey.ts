export type RouteCachePoint = { lat: number; lon: number };

// Builds a stable cache key for a directional origin->destination route.
// Coordinates are rounded (not exact) because a stay cluster's coordinate is
// its dwell run's anchor (first ping), so two separate visits to "the same
// place" land on slightly different GPS-jittered coordinates each time —
// rounding lets repeat visits hit the cache. Not symmetric/sorted: pedestrian
// routes aren't guaranteed direction-symmetric (stairs, one-way paths).
export const buildRouteCacheKey = (
  origin: RouteCachePoint,
  destination: RouteCachePoint,
  precision: number,
): string => {
  const round = (n: number) => n.toFixed(precision);
  return `${round(origin.lat)},${round(origin.lon)}|${round(destination.lat)},${round(destination.lon)}`;
};
