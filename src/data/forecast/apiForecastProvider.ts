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
    // Air temperature only adds context to the chart, so losing it degrades
    // to a heat-index-only chart instead of failing the whole forecast.
    const [heatIndexSeries, temperatureSeries] = await Promise.all([
      fetchPointSeries('heat-index', latitude, longitude, t0, latest),
      fetchPointSeries('temperature', latitude, longitude, t0, latest).catch(
        err => {
          console.log('Forecast air temperature fetch error:', err);
          return { ts: [], values: [] };
        },
      ),
    ]);
    const heatIndexByTs = toValueByTs(heatIndexSeries);
    const temperatureByTs = toValueByTs(temperatureSeries);

    const entries: { ts: string; point: HourlyForecastPoint }[] = [];
    const addPoint = (ts: string, sourceTs: string, observed: boolean) => {
      const heatIndex = heatIndexByTs.get(sourceTs);
      if (heatIndex === undefined) return;
      const temperature = temperatureByTs.get(sourceTs) ?? null;
      entries.push({ ts, point: toPoint(ts, heatIndex, temperature, observed) });
    };

    // Today up to now: real observations, so "now" on the chart is the same
    // value the current-conditions card shows.
    for (let ts = todayStart; ts <= latest; ts = shiftHkTimestamp(ts, 1)) {
      addPoint(ts, ts, true);
    }

    // Demo forecast (see SPATIAL_TEMP_CONFIG.forecastFromHistory): each
    // future hour repeats the observation from `horizon` hours before it.
    if (forecastFromHistory) {
      for (let h = 1; h <= horizon; h++) {
        const ts = shiftHkTimestamp(latest, h);
        addPoint(ts, shiftHkTimestamp(ts, -horizon), false);
      }
    }

    return groupByHkDay(entries, todayKey);
  },
};
