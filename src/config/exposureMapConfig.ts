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
  // Points outside Hong Kong (in_hk: false) — expo_calx can't score them, so
  // they're drawn in a muted light gray regardless of io. Light gray (not
  // dark gray/black) follows the common "disabled / no value" UI convention;
  // a near-black dot read as a strong, valid data point instead.
  outsideHkColor: '#C4C8CE',
  // A light fill with the default white border vanishes on light map tiles,
  // so outside-HK dots get a mid-gray outline to stay visible.
  outsideHkBorderColor: '#8E8E93',
  // Slight translucency reinforces the "invalid area" feel.
  outsideHkDotOpacity: 0.85,
  // Callout text can't reuse the light fill color — too low contrast on
  // the white callout background.
  outsideHkTextColor: '#8E8E93',
  // Bounding-box fit used to frame a day's stay points: a floor so a single
  // point isn't zoomed to street level, and padding so edge dots aren't
  // clipped by the map frame.
  fitMinDeltaDeg: 0.005,
  fitPaddingFactor: 1.6,
  // Camera animation when the shown dataset changes (e.g. picking another
  // day) — the map flies to the new points instead of staying put.
  refitAnimationMs: 500,
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
