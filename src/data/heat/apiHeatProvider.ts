import { HeatDataProvider } from './types';
import {
  fetchLatestTime,
  fetchPointSeries,
  fetchPointValue,
} from '../../services/spatialTempApi';
import { parseHkTimestamp, toHkTimestamp } from '../../utils/hkDate';

export const apiHeatProvider: HeatDataProvider = {
  getConditionsAt: async ({ latitude, longitude }) => {
    // All three families come out of the same hourly pipeline run, so anchor
    // them on one hour — otherwise a pipeline update landing between calls
    // could pair this hour's heat index with last hour's temperature.
    const ts = await fetchLatestTime('heat-index');
    const [temperatureC, relativeHumidityPct, heatIndexC] = await Promise.all([
      fetchPointValue('temperature', latitude, longitude, ts),
      fetchPointValue('humidity', latitude, longitude, ts),
      fetchPointValue('heat-index', latitude, longitude, ts),
    ]);
    return { ts, temperatureC, relativeHumidityPct, heatIndexC };
  },

  getHeatIndexAt: async ({ latitude, longitude }) => {
    const ts = await fetchLatestTime('heat-index');
    return fetchPointValue('heat-index', latitude, longitude, ts);
  },

  getHeatIndexHistoryAt: async ({ latitude, longitude }, fromMs, toMs) => {
    // Capped at the newest hour the pipeline has produced: data lands 1-2 h
    // late, and a range reaching past it is answered with an error rather
    // than the hours it does have. YYYYMMDDhh keys compare as strings.
    const latest = await fetchLatestTime('heat-index');
    const t0 = toHkTimestamp(new Date(fromMs));
    const requestedEnd = toHkTimestamp(new Date(toMs));
    const t1 = requestedEnd < latest ? requestedEnd : latest;
    if (t0 > t1) return [];
    const { ts, values } = await fetchPointSeries('heat-index', latitude, longitude, t0, t1);
    return ts.flatMap((hour, i) =>
      typeof values[i] === 'number'
        ? [{ timestampMs: parseHkTimestamp(hour), value: values[i] }]
        : [],
    );
  },
};
