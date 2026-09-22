import { ExposureHourlyApiRow } from '../../types/exposure';
import { buildExposureReport } from '../../utils/hourlyExposureAdapter';
import { toHkDateKey } from '../../utils/hkDate';
import { ExposureDataProvider } from './types';

const MOCK_DELAY_MS = 400;

// ~0.0005 deg is roughly 55m at HK's latitude — comfortably past
// EXPOSURE_MAP_CONFIG.stayRadiusMeters (30m) so mock waypoints render as
// distinct dots/points instead of re-merging under clusterStayPoints.
const OUTDOOR_WAYPOINT_STEP_DEG = 0.0005;

// Fakes a full day's worth of Indoor/Outdoor hourly rows up to the current
// HK hour, near a fixed HK reference point — enough to exercise the
// stacked-bar chart and map before the ETL backend is configured. Outdoor
// hours are split into several same-hour rows with distinct start_time_hk
// and a short walked path between them, mirroring the new API contract
// (multiple dwell runs can now share an hour_start_hk+io) so the map's
// multi-point route rendering is exercisable without a live backend.
const buildMockRows = (): ExposureHourlyApiRow[] => {
  const dateKey = toHkDateKey().replace(/-/g, '');
  const nowHkHour = new Date(Date.now() + 8 * 60 * 60 * 1000).getUTCHours();
  const rows: ExposureHourlyApiRow[] = [];
  const outdoorWaypointMinutes = [5, 20, 35, 50];

  for (let hour = 0; hour <= nowHkHour; hour++) {
    const hourStr = hour.toString().padStart(2, '0');
    const hourStartHk = `${dateKey}${hourStr}0000`;
    const isIndoorHeavy = hour < 9 || hour >= 18; // "home hours"
    const indoorShare = isIndoorHeavy ? 0.8 : 0.2;

    if (indoorShare > 0) {
      rows.push({
        hour_start_hk: hourStartHk,
        start_time_hk: hourStartHk,
        io: 'Indoor',
        delta_t_hours: indoorShare,
        exposure_value: Number(((0.4 + Math.random() * 0.3) * indoorShare).toFixed(4)),
        lng: 114.1694,
        lat: 22.3193,
      });
    }
    const outdoorShare = 1 - indoorShare;
    if (outdoorShare > 0) {
      const waypointCount = isIndoorHeavy ? 1 : outdoorWaypointMinutes.length;
      const deltaPerWaypoint = outdoorShare / waypointCount;
      for (let w = 0; w < waypointCount; w++) {
        const minuteStr = outdoorWaypointMinutes[w].toString().padStart(2, '0');
        rows.push({
          hour_start_hk: hourStartHk,
          start_time_hk: `${dateKey}${hourStr}${minuteStr}00`,
          io: 'Outdoor',
          delta_t_hours: deltaPerWaypoint,
          exposure_value: Number(
            ((0.6 + Math.random() * 0.8) * deltaPerWaypoint).toFixed(4),
          ),
          lng: 114.1734 + w * OUTDOOR_WAYPOINT_STEP_DEG,
          lat: 22.3213 + w * OUTDOOR_WAYPOINT_STEP_DEG,
        });
      }
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
