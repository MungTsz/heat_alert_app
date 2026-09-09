// src/utils/svgChartLabel.ts
// Shared helper for every Svg bar/line chart's tap-to-reveal value label
// (ExposureTrendChart, AqhiHourlyForecastChart, DailyHeatForecastCard, …).
// A label centered on the selected point clips against the chart's left/right
// edge — or overlaps a neighboring bar — whenever the selection is near
// either end, since react-native-svg has no text-measurement API to react
// to after the fact. This picks an anchor (and, at the very edge, an x) up
// front so the label always stays fully inside the chart's width.
export type ChartLabelAnchor = 'start' | 'middle' | 'end';

// Average glyph width for the bold, small (11-13px) sans-serif labels these
// charts use — an estimate, not a measurement, but consistently tuned to
// err on the side of clamping a little early rather than clipping.
const AVG_CHAR_WIDTH_RATIO = 0.62;

export const estimateSvgTextWidth = (text: string, fontSize: number): number =>
  text.length * fontSize * AVG_CHAR_WIDTH_RATIO;

export const clampedChartLabelX = (
  centerX: number,
  chartWidth: number,
  labelWidth: number,
): { x: number; textAnchor: ChartLabelAnchor } => {
  const halfWidth = labelWidth / 2;
  if (centerX - halfWidth < 0) {
    return { x: 0, textAnchor: 'start' };
  }
  if (centerX + halfWidth > chartWidth) {
    return { x: chartWidth, textAnchor: 'end' };
  }
  return { x: centerX, textAnchor: 'middle' };
};
