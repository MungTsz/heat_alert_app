// src/config/exposureMapConfig.ts

// Tunables for the exposure trajectory map (ExposureTrajectoryMap.tsx) — kept
// here rather than hardcoded in the component so the clustering radius, dot
// size range, and zoom threshold can be adjusted without touching rendering
// logic.
export const EXPOSURE_MAP_CONFIG = {
  trackColor: '#2B7A9E',
  arrowColor: '#2B7A9E',
  // Indoor/outdoor dot coloring — shared with ExposureTrendChart's stacked
  // bars so the same io state reads the same color across map and chart.
  // outdoorColor is amber/gold rather than a pure bright yellow, which
  // washes out against the white card/map background.
  indoorColor: '#8B5CF6',
  outdoorColor: '#F5B700',
  // "Same location" judgment threshold for merging consecutive segments into
  // one stay-point cluster — matches deviceTrackingService.ts's existing
  // distanceFilter of 30m.
  stayRadiusMeters: 30,
  // == the map's previous fixed dot size, so a singleton (unmerged) cluster
  // renders identically to before.
  minDotSizePx: 10,
  maxDotSizePx: 32,
  minDwellMsForSizing: 60 * 60 * 1000, // one time-bucket width
  maxDwellMsForSizing: 8 * 60 * 60 * 1000, // dwell at/above this caps dot size
  // Slippy-map zoom level (see computeZoomLevel) below which direction arrows
  // are hidden to avoid clutter when zoomed out.
  arrowMinZoomLevel: 15,
};
