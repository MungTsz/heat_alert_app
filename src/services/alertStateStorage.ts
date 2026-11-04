// src/services/alertStateStorage.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AlertEvent, AlertMessageRecord } from '../types/alerts';
import { ALERT_MESSAGE_LOG_CONFIG } from '../config/alertConfig';
import { DeliveryLogEntry } from '../utils/alertDelivery';
import { DigestLog } from '../utils/alertDigest';

const EVENTS_KEY = 'alert_events';
const DELIVERY_LOG_KEY = 'alert_delivery_log';
// The old per-alert-id cooldown history, replaced by event tracking.
const LEGACY_HISTORY_KEY = 'heat_alert_history';

const readJson = async <T>(key: string, fallback: T): Promise<T> => {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch (error) {
    console.log(`Failed to read ${key}:`, error);
    return fallback;
  }
};

const writeJson = async (key: string, value: unknown): Promise<void> => {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.log(`Failed to save ${key}:`, error);
  }
};

// Events survive app restarts — that is what keeps a reopened app from
// re-announcing an episode the user already heard about.
export const readAlertEvents = (): Promise<AlertEvent[]> => readJson<AlertEvent[]>(EVENTS_KEY, []);

export const writeAlertEvents = (events: readonly AlertEvent[]): Promise<void> =>
  writeJson(EVENTS_KEY, events);

export const readDeliveryLog = (): Promise<DeliveryLogEntry[]> =>
  readJson<DeliveryLogEntry[]>(DELIVERY_LOG_KEY, []);

export const writeDeliveryLog = (log: readonly DeliveryLogEntry[]): Promise<void> =>
  writeJson(DELIVERY_LOG_KEY, log);

let legacyCleared = false;
export const clearLegacyAlertHistory = async (): Promise<void> => {
  if (legacyCleared) return;
  legacyCleared = true;
  try {
    await AsyncStorage.removeItem(LEGACY_HISTORY_KEY);
  } catch (error) {
    console.log('Failed to remove legacy alert history:', error);
  }
};

// ---- Stage 2: digests, background position, message records --------------

const DIGEST_LOG_KEY = 'alert_digest_log';
const LAST_LOCATION_KEY = 'alert_last_location';
const MESSAGE_LOG_KEY = 'alert_message_log';
const FEEDBACK_KEY = 'alert_feedback';
const PENDING_OPEN_KEY = 'alert_pending_open';

export const readDigestLog = (): Promise<DigestLog> => readJson<DigestLog>(DIGEST_LOG_KEY, {});

export const writeDigestLog = (log: DigestLog): Promise<void> => writeJson(DIGEST_LOG_KEY, log);

export type StoredLocation = { latitude: number; longitude: number; atMs: number };

// The foreground app records each real fix; background checks, which
// can't ask for one, fall back to it while it is recent enough.
export const writeLastKnownLocation = (location: StoredLocation): Promise<void> =>
  writeJson(LAST_LOCATION_KEY, location);

export const readLastKnownLocation = (
  nowMs: number,
  maxAgeMs: number,
): Promise<{ latitude: number; longitude: number } | null> =>
  readJson<StoredLocation | null>(LAST_LOCATION_KEY, null).then(stored =>
    stored && nowMs - stored.atMs <= maxAgeMs
      ? { latitude: stored.latitude, longitude: stored.longitude }
      : null,
  );

export const readMessageLog = (): Promise<AlertMessageRecord[]> =>
  readJson<AlertMessageRecord[]>(MESSAGE_LOG_KEY, []);

// Newest first, trimmed by count and age.
export const appendMessageRecords = async (
  records: readonly AlertMessageRecord[],
  nowMs: number,
): Promise<void> => {
  if (records.length === 0) return;
  const existing = await readMessageLog();
  const { maxEntries, retentionMs } = ALERT_MESSAGE_LOG_CONFIG;
  const kept = [...records, ...existing]
    .filter(record => nowMs - record.sentAtMs < retentionMs)
    .slice(0, maxEntries);
  await writeJson(MESSAGE_LOG_KEY, kept);
};

export type AlertFeedback = Record<string, { helpful: boolean; atMs: number }>;

export const readAlertFeedback = (): Promise<AlertFeedback> =>
  readJson<AlertFeedback>(FEEDBACK_KEY, {});

// "Was this alert helpful?" answers, kept for tuning thresholds later.
export const saveAlertFeedback = async (messageId: string, helpful: boolean): Promise<void> => {
  const feedback = await readAlertFeedback();
  await writeJson(FEEDBACK_KEY, { ...feedback, [messageId]: { helpful, atMs: Date.now() } });
};

// A notification tapped while the app was in the background: the press is
// reported to a headless handler with no UI, so it is parked here for the
// app to open once it comes to the foreground.
export const writePendingAlertOpen = (messageId: string): Promise<void> =>
  writeJson(PENDING_OPEN_KEY, messageId);

export const takePendingAlertOpen = async (): Promise<string | null> => {
  const messageId = await readJson<string | null>(PENDING_OPEN_KEY, null);
  if (messageId !== null) {
    try {
      await AsyncStorage.removeItem(PENDING_OPEN_KEY);
    } catch (error) {
      console.log('Failed to clear pending alert open:', error);
    }
  }
  return messageId;
};
