// src/services/exposureHistoryService.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DailyExposureEntry, ExposureReport, ExposureSegmentResult } from '../types/exposure';
import { DEFAULT_PID } from '../hooks/useExposureReport';

// The background-geolocation plugin only reliably retains ~1 day of raw
// points (see deviceTrackingService.ts), so "browse a past day"/"last 10
// days" can't be built by re-querying it — each day's already-computed
// report is persisted here as it's produced instead.
const HISTORY_KEY = 'exposure_daily_history';
const RETENTION_MS = 14 * 24 * 60 * 60 * 1000; // a few days' buffer past the 10 shown

type HistoryMap = Record<string, DailyExposureEntry>;

// The live device (DEFAULT_PID) keeps the original unprefixed storage key —
// no migration needed for existing installs. Named device workspaces
// (see exposureDeviceService.ts) each get their own key so their history
// never mixes with the live device's or each other's.
const historyKeyFor = (deviceId: string): string =>
  deviceId === DEFAULT_PID ? HISTORY_KEY : `${HISTORY_KEY}:${deviceId}`;

const readHistory = async (deviceId: string): Promise<HistoryMap> => {
  try {
    const raw = await AsyncStorage.getItem(historyKeyFor(deviceId));
    return raw ? JSON.parse(raw) : {};
  } catch (error) {
    console.log('Failed to read exposure history:', error);
    return {};
  }
};

const mergeReports = (a: ExposureReport, b: ExposureReport): ExposureReport => {
  const segments: ExposureSegmentResult[] = [...a.segments, ...b.segments].sort(
    (x, y) => x.startTime - y.startTime,
  );
  return {
    totalExposure: segments.reduce((sum, s) => sum + (s.exposure > 0 ? s.exposure : 0), 0),
    segments,
    timeRangeStart: segments[0]?.startTime ?? Math.min(a.timeRangeStart, b.timeRangeStart),
    timeRangeEnd: segments[segments.length - 1]?.endTime ?? Math.max(a.timeRangeEnd, b.timeRangeEnd),
    pointCount: a.pointCount + b.pointCount,
  };
};

// Saves a day's report for the given device (the live device by default).
// If that device already has an entry for this day — e.g. a second import
// landing on a date already covered by an earlier one — the two reports are
// merged rather than one overwriting the other, so a device's history
// accumulates across imports the same way the live device's accumulates
// across a day's tracking ticks.
export const saveDailyExposureReport = async (
  dateKey: string,
  report: ExposureReport,
  deviceId: string = DEFAULT_PID,
): Promise<void> => {
  const history = await readHistory(deviceId);
  const now = Date.now();
  const existing = history[dateKey];
  const mergedReport =
    deviceId === DEFAULT_PID || !existing ? report : mergeReports(existing.report, report);
  history[dateKey] = { date: dateKey, report: mergedReport, updatedAt: now };

  const pruned: HistoryMap = {};
  for (const [date, entry] of Object.entries(history)) {
    if (now - entry.updatedAt < RETENTION_MS) {
      pruned[date] = entry;
    }
  }

  try {
    await AsyncStorage.setItem(historyKeyFor(deviceId), JSON.stringify(pruned));
  } catch (error) {
    console.log('Failed to save exposure history:', error);
  }
};

export const getDailyExposureHistory = async (
  deviceId: string = DEFAULT_PID,
): Promise<DailyExposureEntry[]> => {
  const history = await readHistory(deviceId);
  return Object.values(history).sort((a, b) => a.date.localeCompare(b.date));
};
