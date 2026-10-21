import { ExposureHourlyApiRow, ExposureIo, ExposurePointKind } from '../../types/exposure';
import { buildExposureReport } from '../../utils/hourlyExposureAdapter';
import { toHkDateKey } from '../../utils/hkDate';
import { ExposureDataProvider } from './types';

const MOCK_DELAY_MS = 400;
const MINUTES_PER_HOUR = 60;
const MINUTES_PER_DAY = 24 * MINUTES_PER_HOUR;
const HK_OFFSET_MS = 8 * 60 * 60 * 1000;

// Relative exposure per hour by io — only so the mock's stacked bars have
// plausible proportions (open air highest, MTR lowest); not a model.
const MOCK_EXPOSURE_RATE: Record<ExposureIo, number> = {
  Outdoor: 1.0,
  Vehicle: 0.7,
  MTR: 0.4,
  'Other Indoor': 0.5,
  School: 0.5,
  Office: 0.45,
  Home: 0.5,
};

type MockPoint = {
  at: string; // HH:MM HK local — the point lasts until the next one's `at`
  io: ExposureIo;
  kind: ExposurePointKind;
  reason: string;
  lat: number;
  lng: number;
  road?: string;
  labelled?: boolean; // decided by a place label rather than the rules
};

const HOME = { lat: 22.3193, lng: 114.1694 };
const OFFICE = { lat: 22.278, lng: 114.1676 };

const stay = (
  at: string,
  io: ExposureIo,
  reason: string,
  pos: { lat: number; lng: number },
): MockPoint => ({ at, io, kind: 'stay', reason, ...pos, labelled: reason === 'place_label' });

const route = (
  at: string,
  io: ExposureIo,
  reason: string,
  lat: number,
  lng: number,
  road?: string,
): MockPoint => ({ at, io, kind: 'route', reason, lat, lng, road });

// A commuter's day between Mong Kok and Admiralty, scripted to cover every io
// type and both point kinds — an underground MTR jump (drawn dashed), a bus
// ride with road names, walks, short stops and labelled places — so the
// map's lines/arrows and the charts' colors can all be reviewed without the
// ETL backend. Mirrors the backend's contract: a stay is one point, a route
// several, and each point owns the time until the next one.
const MOCK_DAY: MockPoint[] = [
  stay('00:00', 'Home', 'night_stay', HOME),
  route('08:00', 'Outdoor', 'walk', 22.3193, 114.1694),
  route('08:04', 'Outdoor', 'walk', 22.3199, 114.1703),
  route('08:07', 'Outdoor', 'walk', 22.3194, 114.1716),
  stay('08:09', 'Outdoor', 'short_stop', { lat: 22.3192, lng: 114.1718 }),
  route('08:12', 'MTR', 'jump', 22.3192, 114.1718), // Mong Kok
  route('08:16', 'MTR', 'jump', 22.2976, 114.1722), // Tsim Sha Tsui
  route('08:21', 'MTR', 'jump', 22.2793, 114.1646), // Admiralty
  route('08:24', 'Outdoor', 'walk', 22.2789, 114.1652),
  route('08:28', 'Outdoor', 'walk', 22.2782, 114.1668),
  stay('08:32', 'Office', 'place_label', OFFICE),
  route('12:30', 'Outdoor', 'walk', 22.278, 114.1676),
  route('12:34', 'Outdoor', 'walk', 22.2772, 114.1689),
  stay('12:40', 'Other Indoor', 'long_stay', { lat: 22.2768, lng: 114.1702 }),
  route('13:25', 'Outdoor', 'walk', 22.2768, 114.1702),
  route('13:30', 'Outdoor', 'walk', 22.2776, 114.1683),
  stay('13:36', 'Office', 'place_label', OFFICE),
  route('18:05', 'Outdoor', 'walk', 22.278, 114.1676),
  stay('18:09', 'Outdoor', 'short_stop', { lat: 22.2797, lng: 114.166 }),
  route('18:15', 'Vehicle', 'vehicle', 22.2797, 114.166, 'HARCOURT ROAD'),
  route('18:19', 'Vehicle', 'vehicle', 22.285, 114.181, 'CROSS HARBOUR TUNNEL'),
  route('18:25', 'Vehicle', 'vehicle', 22.3008, 114.1807, 'HONG CHONG ROAD'),
  route('18:31', 'Vehicle', 'vehicle', 22.3049, 114.1776, 'CHATHAM ROAD NORTH'),
  route('18:36', 'Vehicle', 'vehicle', 22.3117, 114.1706, 'NATHAN ROAD'),
  route('18:42', 'Vehicle', 'vehicle', 22.3176, 114.1696, 'NATHAN ROAD'),
  route('18:46', 'Outdoor', 'walk', 22.318, 114.169),
  stay('18:50', 'School', 'place_label', { lat: 22.3184, lng: 114.1683 }),
  route('20:00', 'Outdoor', 'walk', 22.3184, 114.1683),
  route('20:05', 'Outdoor', 'walk', 22.3189, 114.169),
  stay('20:10', 'Home', 'near_night_stay', HOME),
];

const toMinuteOfDay = (hhmm: string): number =>
  Number(hhmm.slice(0, 2)) * MINUTES_PER_HOUR + Number(hhmm.slice(3, 5));

const pad2 = (n: number): string => n.toString().padStart(2, '0');

// YYYYMMDDHHMMSS, HK local — the backend's timestamp format.
const hkStamp = (dateKey: string, minuteOfDay: number): string =>
  `${dateKey}${pad2(Math.floor(minuteOfDay / MINUTES_PER_HOUR))}${pad2(minuteOfDay % MINUTES_PER_HOUR)}00`;

// Today's rows of MOCK_DAY up to the current HK minute, cut at HK clock
// hours exactly like the backend (one row per point per hour it overlaps).
const buildMockRows = (): ExposureHourlyApiRow[] => {
  const dateKey = toHkDateKey().replace(/-/g, '');
  const nowHk = new Date(Date.now() + HK_OFFSET_MS);
  const nowMinute = nowHk.getUTCHours() * MINUTES_PER_HOUR + nowHk.getUTCMinutes();
  const rows: ExposureHourlyApiRow[] = [];

  MOCK_DAY.forEach((point, i) => {
    const next = MOCK_DAY[i + 1];
    const start = toMinuteOfDay(point.at);
    const end = Math.min(next ? toMinuteOfDay(next.at) : MINUTES_PER_DAY, nowMinute);

    // heading_deg/compass are left out: the app draws arrows from the line
    // geometry and never reads them.
    for (let sliceStart = start; sliceStart < end; ) {
      const hourStart = Math.floor(sliceStart / MINUTES_PER_HOUR) * MINUTES_PER_HOUR;
      const sliceEnd = Math.min(end, hourStart + MINUTES_PER_HOUR);
      const deltaHours = (sliceEnd - sliceStart) / MINUTES_PER_HOUR;
      rows.push({
        hour_start_hk: hkStamp(dateKey, hourStart),
        start_time_hk: hkStamp(dateKey, sliceStart),
        io: point.io,
        io_source: point.labelled ? 'label' : 'inferred',
        reason: point.reason,
        kind: point.kind,
        delta_t_hours: deltaHours,
        exposure_value: Number(
          (MOCK_EXPOSURE_RATE[point.io] * (0.8 + Math.random() * 0.4) * deltaHours).toFixed(4),
        ),
        lng: point.lng,
        lat: point.lat,
        road_name: point.road ?? null,
        in_hk: true,
      });
      sliceStart = sliceEnd;
    }
  });

  return rows;
};

// pid → YYYYMMDD day keys deleted this session, so delete-day → re-import
// can be walked through without a backend. Any mock import of a pid brings
// its days back, since the mock can't tell which day a file covers.
const deletedDays = new Map<string, Set<string>>();

const mockIngest = (pid: string) => {
  deletedDays.delete(pid);
  // No real ETL runs, so there's no honest processed count to report.
  return Promise.resolve({ processedRows: null });
};

export const mockExposureProvider: ExposureDataProvider = {
  ingest: pid => mockIngest(pid),
  ingestGpx: pid => mockIngest(pid),
  getHourlyReport: pid =>
    new Promise(resolve => {
      const deleted = deletedDays.get(pid);
      const rows = buildMockRows().filter(row => !deleted?.has(row.start_time_hk.slice(0, 8)));
      setTimeout(() => resolve(buildExposureReport(rows)), MOCK_DELAY_MS);
    }),
  deleteDay: (pid, dateKey) => {
    const days = deletedDays.get(pid) ?? new Set<string>();
    days.add(dateKey.replace(/-/g, ''));
    deletedDays.set(pid, days);
    return Promise.resolve();
  },
};
