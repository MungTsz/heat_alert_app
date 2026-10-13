// src/config/exposureWeekChartConfig.ts

// The week the Exposure tab's daily chart pages through — one Sun→Sat week
// per swipe page, the common "Screen Time"-style layout. Also passed to the
// date picker's calendar (firstDay) so its rows line up with the chart's
// pages. 0 = Sunday … 6 = Saturday, matching Date#getUTCDay.
export const WEEK_START_DAY = 0;

const ALL_WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Rotated to start at WEEK_START_DAY, so changing that one constant re-orders
// the x-axis labels too instead of them silently disagreeing with the bars.
export const WEEKDAY_LABELS = [
  ...ALL_WEEKDAY_LABELS.slice(WEEK_START_DAY),
  ...ALL_WEEKDAY_LABELS.slice(0, WEEK_START_DAY),
];

export const EXPOSURE_WEEK_CHART_CONFIG = {
  // Bright system green, drawn dashed, so the average line can't be mistaken
  // for any io color in EXPOSURE_IO_CONFIG (amber / purple / dark green /
  // teal / navy) — School's green is much darker and only ever a solid bar.
  avgLineColor: '#34C759',
  avgLineDash: '4,4',
  avgLabel: 'Avg',
  // Neutral gray rather than red/green: the week-over-week chip reports a
  // change, not a verdict (same treatment as iOS Screen Time).
  trendColor: '#8E8E93',
  // A change smaller than this (in %) reads as "Same as last week" instead of
  // a noisy "↑ 0%" — tiny day-to-day fluctuations aren't a real trend.
  sameAsLastWeekThresholdPct: 1,
};
