// Below this straight-line distance, a detour-ratio check is meaningless
// (division blows up toward infinity for any nonzero routed distance) — e.g.
// an Indoor->Outdoor hop anchored at the same doorway. Accept the route
// outright instead of false-flagging it as a fallback.
const MIN_STRAIGHT_LINE_METERS_FOR_RATIO_CHECK = 5;

// True if a routed path's distance is a plausible walk between two points,
// vs. a wild detour that signals "no real road/path exists here" (e.g. a
// beach walk with no mapped route, routed all the way around a bay instead).
export const isReasonableRoute = (
  routeDistanceMeters: number,
  straightLineMeters: number,
  maxRatio: number,
): boolean => {
  if (straightLineMeters < MIN_STRAIGHT_LINE_METERS_FOR_RATIO_CHECK) return true;
  return routeDistanceMeters / straightLineMeters <= maxRatio;
};
