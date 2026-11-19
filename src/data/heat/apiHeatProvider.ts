import { HeatDataProvider } from './types';
import {
  currentDataHour,
  fetchPointValue,
} from '../../services/spatialTempApi';

export const apiHeatProvider: HeatDataProvider = {
  getConditionsAt: async ({ latitude, longitude }) => {
    // All three families are read at one hour, so an hour boundary passing
    // between calls can't pair this hour's heat index with last hour's
    // temperature.
    const ts = currentDataHour();
    const [temperatureC, relativeHumidityPct, heatIndexC] = await Promise.all([
      fetchPointValue('temperature', latitude, longitude, ts),
      fetchPointValue('humidity', latitude, longitude, ts),
      fetchPointValue('heat-index', latitude, longitude, ts),
    ]);
    return { ts, temperatureC, relativeHumidityPct, heatIndexC };
  },

  getHeatIndexAt: async ({ latitude, longitude }) =>
    fetchPointValue('heat-index', latitude, longitude, currentDataHour()),
};
