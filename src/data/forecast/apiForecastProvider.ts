import { ForecastDataProvider, DayForecast, HourlyForecastPoint } from './types';
import { SPATIAL_TEMP_CONFIG } from '../../config/spatialTempConfig';
import {
  currentDataHour,
  fetchPointSeries,
} from '../../services/spatialTempApi';
import { parseHkTimestamp, shiftHkTimestamp } from '../../utils/hkDate';

const WEEKDAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const toPoint = (
  ts: string,
  heatIndex: number,
  temperature: number | null,
  observed: boolean,
): HourlyForecastPoint => ({
  timestamp: parseHkTimestamp(ts),
  time: `${ts.slice(8, 10)}:00`,
  heatIndex,
  temperature,
  observed,
});

const toValueByTs = ({ ts, values }: { ts: string[]; values: number[] }) =>
  new Map(ts.map((t, i) => [t, values[i]]));

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
    const { forecastHorizonHours: horizon } = SPATIAL_TEMP_CONFIG;
    const now = currentDataHour();
    const todayKey = now.slice(0, 8);
    const todayStart = `${todayKey}00`;
    const end = shiftHkTimestamp(now, horizon);

    // The API is one continuous timeline, so one request per family covers
    // the whole chart: today's hours up to now, then the forecast. Near the
    // end of the forecast run the API answers with fewer hours (status 0 +
    // a "Partial data" warning) — the chart simply ends earlier.
    // Air temperature only adds context to the chart, so losing it degrades
    // to a heat-index-only chart instead of failing the whole forecast.
    const [heatIndexSeries, temperatureSeries] = await Promise.all([
      fetchPointSeries('heat-index', latitude, longitude, todayStart, end),
      fetchPointSeries('temperature', latitude, longitude, todayStart, end).catch(
        err => {
          console.log('Forecast air temperature fetch error:', err);
          return { ts: [], values: [] };
        },
      ),
    ]);
    const heatIndexByTs = toValueByTs(heatIndexSeries);
    const temperatureByTs = toValueByTs(temperatureSeries);

    const entries: { ts: string; point: HourlyForecastPoint }[] = [];
    // Walk the hours ourselves (not the response's ts list) so the points
    // are in order and an hour the API skipped just leaves a gap. Fixed-width
    // YYYYMMDDhh keys compare correctly as strings.
    for (let ts = todayStart; ts <= end; ts = shiftHkTimestamp(ts, 1)) {
      const heatIndex = heatIndexByTs.get(ts);
      if (heatIndex === undefined) continue;
      const temperature = temperatureByTs.get(ts) ?? null;
      // Up to and including the current hour = what the card shows as now;
      // every later hour is forecast.
      entries.push({ ts, point: toPoint(ts, heatIndex, temperature, ts <= now) });
    }

    return groupByHkDay(entries, todayKey);
  },
};
