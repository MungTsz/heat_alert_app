// src/config/exposureMapConfig.ts

// Tunables for the exposure trajectory map (ExposureTrajectoryMap.tsx) — kept
// here rather than hardcoded in the component so the clustering radius, dot
// size range, and zoom threshold can be adjusted without touching rendering
// logic.
export const EXPOSURE_MAP_CONFIG = {
  // Indoor/outdoor dot coloring — shared with ExposureTrendChart's stacked
  // bars so the same io state reads the same color across map and chart.
  // outdoorColor is a darker burnt-amber (not the lighter gold it used to be)
  // because the map tiles render in light mode (userInterfaceStyle="light" in
  // ExposureTrajectoryMap): a lighter yellow/gold washes out against light
  // roads/land, roughly halving WCAG contrast vs this shade.
  indoorColor: '#8B5CF6',
  outdoorColor: '#C2790C',
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
  // Delay before dot Markers' tracksViewChanges flips from true to false
  // after the cluster set changes — react-native-maps/Android can leave a
  // custom-View marker permanently blank if tracksViewChanges is already
  // false before the native layer captures its first snapshot, so markers
  // start "tracked" for one brief window to force that snapshot.
  markerSnapshotDelayMs: 300,
};
