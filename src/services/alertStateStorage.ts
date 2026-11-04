// src/services/alertStateStorage.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AlertEvent } from '../types/alerts';
import { DeliveryLogEntry } from '../utils/alertDelivery';

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
