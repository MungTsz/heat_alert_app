// src/utils/exposureWeekStats.ts
import { DailyExposureEntry, EXPOSURE_IO_TYPES, ExposureIo } from '../types/exposure';
import { sumExposureByIo } from './exposureIoTotals';
import { addHkDays, formatHkDateLabel } from './hkDate';
import { EXPOSURE_WEEK_CHART_CONFIG, WEEKDAY_LABELS } from '../config/exposureWeekChartConfig';

const DAYS_PER_WEEK = 7;

// One day slot of the weekly chart.
// total: null = no tracked data that day; 0 = tracked but nothing scored.
export type DayBar = {
  date: string;
  label: string;
  byIo: Record<ExposureIo, number> | null;
  total: number | null;
  // After todayKey — the rest of an in-progress week. Rendered with no
  // placeholder bar and not tappable, since there's nothing to show yet.
  isFuture: boolean;
};

export type WeekStats = {
  total: number;
  trackedDays: number;
  // null when nothing in the week was tracked — distinct from a real 0 avg.
  dailyAverage: number | null;
};

export type WeekComparison = {
  direction: 'up' | 'down' | 'same';
  pct: number; // absolute % change, rounded
};

// date → per-io totals for every tracked day, built once and shared by every
// week page (rather than re-summing segments per page). Today's split comes
// from the live report when given — the persisted history can lag a poll
// tick behind it.
export const buildDailyIoMap = (
  history: DailyExposureEntry[],
  todayOverride?: { date: string; byIo: Record<ExposureIo, number> },
): Map<string, Record<ExposureIo, number>> => {
  const map = new Map<string, Record<ExposureIo, number>>();
  for (const entry of history) map.set(entry.date, sumExposureByIo(entry.report.segments).byIo);
  if (todayOverride) map.set(todayOverride.date, todayOverride.byIo);
  return map;
};

export const buildWeekDays = (
  weekStart: string,
  dailyMap: Map<string, Record<ExposureIo, number>>,
  todayKey: string,
): DayBar[] =>
  Array.from({ length: DAYS_PER_WEEK }, (_, i) => {
    const date = addHkDays(weekStart, i);
    const byIo = dailyMap.get(date) ?? null;
    return {
      date,
      label: WEEKDAY_LABELS[i],
      byIo,
      total: byIo ? EXPOSURE_IO_TYPES.reduce((sum, io) => sum + byIo[io], 0) : null,
      isFuture: date > todayKey,
    };
  });

// Averages over TRACKED days only: an untracked day is missing data, not a
// 0-exposure day, so counting it would drag the average down (and make an
// in-progress week look artificially low against a complete last week).
// A tracked day that scored 0 (e.g. entirely outside HK) still counts.
export const computeWeekStats = (days: DayBar[]): WeekStats => {
  const tracked = days.filter(d => d.total !== null);
  const total = tracked.reduce((sum, d) => sum + (d.total ?? 0), 0);
  return {
    total,
    trackedDays: tracked.length,
    dailyAverage: tracked.length > 0 ? total / tracked.length : null,
  };
};

// null when there's nothing meaningful to compare against (no data either
// week, or a 0 baseline that would make the % change infinite).
export const compareWeeks = (
  currentAvg: number | null,
  previousAvg: number | null,
): WeekComparison | null => {
  if (currentAvg === null || previousAvg === null || previousAvg <= 0) return null;
  const change = ((currentAvg - previousAvg) / previousAvg) * 100;
  const pct = Math.round(Math.abs(change));
  if (Math.abs(change) < EXPOSURE_WEEK_CHART_CONFIG.sameAsLastWeekThresholdPct) {
    return { direction: 'same', pct: 0 };
  }
  return { direction: change > 0 ? 'up' : 'down', pct };
};

// Every week start from firstWeekStart through lastWeekStart, inclusive —
// the swipeable pages, oldest first.
export const listWeekStarts = (firstWeekStart: string, lastWeekStart: string): string[] => {
  const weeks: string[] = [];
  for (let cursor = firstWeekStart; cursor <= lastWeekStart; cursor = addHkDays(cursor, DAYS_PER_WEEK)) {
    weeks.push(cursor);
  }
  return weeks;
};

export const addHkWeeks = (weekStart: string, weeks: number): string =>
  addHkDays(weekStart, weeks * DAYS_PER_WEEK);

// "Oct 5 – Oct 11" — shared by the week card's pager header and the detail
// screens' date pill when no single day is selected.
export const formatHkWeekRangeLabel = (weekStart: string): string =>
  `${formatHkDateLabel(weekStart)} – ${formatHkDateLabel(addHkDays(weekStart, DAYS_PER_WEEK - 1))}`;
