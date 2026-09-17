// src/utils/chartAxisLabels.ts
// Generalizes the ad hoc x-axis label spacing every hand-built Svg bar chart
// in this repo used to compute on its own (ExposureDailyBarChart's
// Math.ceil(days.length/12), ExposureTrendChart's hardcoded 4) into one
// shared rule.
//
// Deriving the stride from the *visible page size* (already clamped to
// whatever min/max bars-per-page a chart uses) rather than the full data
// length is what keeps labels evenly spaced on every scrolled page,
// regardless of scroll offset: an interval whose length is an exact
// multiple of the stride always contains the same number of
// stride-multiples, independent of where that interval starts.
export const pickAxisLabelStride = (visibleCount: number, maxLabels: number): number =>
  Math.max(1, Math.ceil(visibleCount / maxLabels));
