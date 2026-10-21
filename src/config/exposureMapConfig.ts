// src/config/exposureMapConfig.ts

// Tunables for the exposure trajectory map (ExposureTrajectoryMap.tsx) — kept
// here rather than hardcoded in the component so the clustering radius, dot
// size range, and zoom threshold can be adjusted without touching rendering
// logic.
export const EXPOSURE_MAP_CONFIG = {
  // Per-io dot colors live in exposureIoConfig.ts (EXPOSURE_IO_CONFIG) — the
  // single source shared with the stacked-bar charts.
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
  // Stay-sheet text/chip can't reuse the light fill color — too low
  // contrast on the white sheet background.
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
  // Indoor stays never shrink below this, so every one is big enough to show
  // its category icon: icon badge = a place you stayed in, small plain dot =
  // a brief stop outdoors. Size still grows with dwell time above it.
  indoorStayMinDotSizePx: 22,
  // Icon size as a share of the dot, so a long overnight stay's icon grows
  // with its dot instead of floating small in the middle.
  stayIconScale: 0.55,

  // Route lines. Each leg is drawn twice: a wider white casing underneath
  // (the same trick Google Maps uses for its own routes) so the colored line
  // stays legible over busy roads and labels.
  routeLineWidthPx: 4,
  routeCasingWidthPx: 7,
  routeCasingColor: 'rgba(255,255,255,0.95)',
  // Dashes = "path not traced by GPS" (an underground MTR ride, drawn as a
  // straight line between stations). Dashed legs must use lineCap 'butt':
  // on Android a round cap turns every dash into a dot.
  inferredPathDashPattern: [10, 7],
  // A light outside-HK fill vanishes as a thin line on light tiles, so
  // outside-HK legs use the darker outline gray instead.
  outsideHkRouteColor: '#8E8E93',

  // Direction arrows along route legs, spaced in SCREEN pixels so their
  // density stays the same at every zoom level and in full screen.
  arrowSpacingPx: 90,
  // A leg shorter than this on screen gets no arrow — it would only sit on
  // top of the stay dots at either end.
  minLegLengthForArrowPx: 28,
  arrowBadgeSizePx: 16,
  arrowIconSizePx: 11,
  // Hard cap on arrow markers (each is a native custom view); the spacing
  // doubles until a dense, zoomed-out day fits under it.
  maxArrowMarkers: 60,
  // Arrows are placed half a screen beyond each edge of the visible region,
  // so a short pan doesn't show bare line before they're re-placed.
  arrowViewportMarginFactor: 0.5,

  // Vehicle trip sheet: road names listed before "+N more".
  maxRoadNamesShown: 3,
  // Delay before dot Markers' tracksViewChanges flips from true to false
  // after the cluster set changes — react-native-maps/Android can leave a
  // custom-View marker permanently blank if tracksViewChanges is already
  // false before the native layer captures its first snapshot, so markers
  // start "tracked" for one brief window to force that snapshot.
  markerSnapshotDelayMs: 300,
};
