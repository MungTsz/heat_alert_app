// src/services/exposureHistoryService.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DailyExposureEntry } from '../types/exposure';
import { exposureDataProvider } from '../data/exposure';
import { splitExposureReportByDay } from '../utils/splitReportByDay';
import { DEFAULT_PID } from '../utils/exposurePid';

// The ETL backend is now the source of truth for a pid's full history
// (GET /exposure/hourly/{pid} returns everything ever ingested, unfiltered
// by date) — this is just an AsyncStorage cache of the last successful
// fetch, for instant paint and an offline fallback, not an accumulating log.
const HISTORY_KEY = 'exposure_daily_history';
// Bounds cache size for long-lived devices — the backend itself is the
// unbounded store; this only needs enough days for recent browsing. Also
// reused by ExposureDatePickerModal as the date picker's max range cap, so
// the two numbers can't drift apart — a maxed-out range pick should never
// outrun what's actually cached.
export const MAX_CACHED_DAYS = 90;

type HistoryMap = Record<string, DailyExposureEntry>;

// The live device (DEFAULT_PID) keeps the original unprefixed storage key —
// no migration needed for existing installs. Named device workspaces
// (see exposureDeviceService.ts) each get their own key so their history
// never mixes with the live device's or each other's.
const historyKeyFor = (deviceId: string): string =>
  deviceId === DEFAULT_PID ? HISTORY_KEY : `${HISTORY_KEY}:${deviceId}`;

const readCache = async (deviceId: string): Promise<HistoryMap> => {
  try {
    const raw = await AsyncStorage.getItem(historyKeyFor(deviceId));
    return raw ? JSON.parse(raw) : {};
  } catch (error) {
    console.log('Failed to read cached exposure history:', error);
    return {};
  }
};

const toSortedEntries = (map: HistoryMap): DailyExposureEntry[] =>
  Object.values(map).sort((a, b) => a.date.localeCompare(b.date));

// Re-fetches the pid's full history from the backend, re-caches it, and
// returns it — call this whenever the UI needs fresh data (a live poll tick,
// opening a device's history, after an import).
export const refreshHistoryCache = async (
  deviceId: string = DEFAULT_PID,
): Promise<DailyExposureEntry[]> => {
  const report = await exposureDataProvider.getHourlyReport(deviceId);
  const now = Date.now();
  const slices = splitExposureReportByDay(report);
  const map: HistoryMap = {};
  for (const { date, report: dayReport } of slices.slice(-MAX_CACHED_DAYS)) {
    map[date] = { date, report: dayReport, updatedAt: now };
  }

  try {
    await AsyncStorage.setItem(historyKeyFor(deviceId), JSON.stringify(map));
  } catch (error) {
    console.log('Failed to cache exposure history:', error);
  }

  return toSortedEntries(map);
};

// Cache-only read — no network call, so it renders instantly and still
// works if the backend is unreachable.
export const getCachedDailyExposureHistory = async (
  deviceId: string = DEFAULT_PID,
): Promise<DailyExposureEntry[]> => toSortedEntries(await readCache(deviceId));
