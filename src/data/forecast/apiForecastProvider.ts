import { ForecastDataProvider, DayForecast, HourlyForecastPoint } from './types';
import { SPATIAL_TEMP_CONFIG } from '../../config/spatialTempConfig';
import {
  fetchLatestTime,
  fetchPointSeries,
} from '../../services/spatialTempApi';
import { parseHkTimestamp, shiftHkTimestamp } from '../../utils/hkDate';

const WEEKDAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const toPoint = (
  ts: string,
  heatIndex: number,
  observed: boolean,
): HourlyForecastPoint => ({
  timestamp: parseHkTimestamp(ts),
  time: `${ts.slice(8, 10)}:00`,
  heatIndex,
  observed,
});

// Buckets hourly points into HK calendar days. Weekday/day-of-month are read
// off the HK date key itself, so they're right regardless of the phone's
// own timezone.
const groupByHkDay = (
  entries: { ts: string; point: HourlyForecastPoint }[],
  todayKey: string,
): DayForecast[] => {
  const days = new Map<string, HourlyForecastPoint[]>();
  for (const { ts, point } of entries) {
    const dayKey = ts.slice(0, 8);
    if (!days.has(dayKey)) days.set(dayKey, []);
    days.get(dayKey)!.push(point);
  }
  return [...days.entries()].map(([dayKey, points]) => {
    const dayStartTs = `${dayKey}00`;
    const dateMs = parseHkTimestamp(dayStartTs);
    const y = Number(dayKey.slice(0, 4));
    const m = Number(dayKey.slice(4, 6));
    const d = Number(dayKey.slice(6, 8));
    return {
      weekdayShort: WEEKDAYS_SHORT[new Date(Date.UTC(y, m - 1, d)).getUTCDay()],
      dayOfMonth: d,
      dateMs,
      isToday: dayKey === todayKey,
      points,
    };
  });
};

export const apiForecastProvider: ForecastDataProvider = {
  getForecast: async ({ latitude, longitude }) => {
    const { forecastHorizonHours: horizon, forecastFromHistory } =
      SPATIAL_TEMP_CONFIG;
    const latest = await fetchLatestTime('heat-index');
    const todayKey = latest.slice(0, 8);
    const todayStart = `${todayKey}00`;

    // One request covers both halves of the chart: today's observed hours
    // (todayStart..latest) and, for the demo forecast, the hours the future
    // is borrowed from (latest-horizon+1..latest). Fixed-width YYYYMMDDhh
    // keys compare correctly as strings.
    const historySource = shiftHkTimestamp(latest, -horizon + 1);
    const t0 = historySource < todayStart ? historySource : todayStart;
    const series = await fetchPointSeries(
      'heat-index',
      latitude,
      longitude,
      t0,
      latest,
    );
    const valueByTs = new Map(series.ts.map((ts, i) => [ts, series.values[i]]));

    const entries: { ts: string; point: HourlyForecastPoint }[] = [];

    // Today up to now: real observations, so "now" on the chart is the same
    // value the current-conditions card shows.
    for (let ts = todayStart; ts <= latest; ts = shiftHkTimestamp(ts, 1)) {
      const value = valueByTs.get(ts);
      if (value !== undefined) entries.push({ ts, point: toPoint(ts, value, true) });
    }

    // Demo forecast (see SPATIAL_TEMP_CONFIG.forecastFromHistory): each
    // future hour repeats the observation from `horizon` hours before it.
    if (forecastFromHistory) {
      for (let h = 1; h <= horizon; h++) {
        const ts = shiftHkTimestamp(latest, h);
        const value = valueByTs.get(shiftHkTimestamp(ts, -horizon));
        if (value !== undefined) entries.push({ ts, point: toPoint(ts, value, false) });
      }
    }

    return groupByHkDay(entries, todayKey);
  },
};
