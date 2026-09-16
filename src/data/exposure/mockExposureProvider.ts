import { ExposureHourlyApiRow } from '../../types/exposure';
import { buildExposureReport } from '../../utils/hourlyExposureAdapter';
import { toHkDateKey } from '../../utils/hkDate';
import { ExposureDataProvider } from './types';

const MOCK_DELAY_MS = 400;

// Fakes a full day's worth of Indoor/Outdoor hourly rows up to the current
// HK hour, near a fixed HK reference point — enough to exercise the
// stacked-bar chart and map before the ETL backend is configured.
const buildMockRows = (): ExposureHourlyApiRow[] => {
  const dateKey = toHkDateKey().replace(/-/g, '');
  const nowHkHour = new Date(Date.now() + 8 * 60 * 60 * 1000).getUTCHours();
  const rows: ExposureHourlyApiRow[] = [];

  for (let hour = 0; hour <= nowHkHour; hour++) {
    const hourStr = hour.toString().padStart(2, '0');
    const isIndoorHeavy = hour < 9 || hour >= 18; // "home hours"
    const indoorShare = isIndoorHeavy ? 0.8 : 0.2;

    if (indoorShare > 0) {
      rows.push({
        hour_start_hk: `${dateKey}${hourStr}0000`,
        io: 'Indoor',
        delta_t_hours: indoorShare,
        exposure_value: Number(((0.4 + Math.random() * 0.3) * indoorShare).toFixed(4)),
        lng: 114.1694,
        lat: 22.3193,
      });
    }
    if (1 - indoorShare > 0) {
      rows.push({
        hour_start_hk: `${dateKey}${hourStr}0000`,
        io: 'Outdoor',
        delta_t_hours: 1 - indoorShare,
        exposure_value: Number(((0.6 + Math.random() * 0.8) * (1 - indoorShare)).toFixed(4)),
        lng: 114.1734,
        lat: 22.3213,
      });
    }
  }

  return rows;
};

export const mockExposureProvider: ExposureDataProvider = {
  ingest: () => Promise.resolve(),
  getHourlyReport: () =>
    new Promise(resolve => {
      setTimeout(() => resolve(buildExposureReport(buildMockRows())), MOCK_DELAY_MS);
    }),
};
