import { HeatDataProvider } from './types';
import {
  fetchLatestTime,
  fetchPointValue,
} from '../../services/spatialTempApi';

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
};
