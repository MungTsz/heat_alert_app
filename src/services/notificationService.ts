import notifee, { AndroidImportance } from '@notifee/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { HeatAlert } from '../types/alerts';

const CHANNEL_ID = 'heat-alerts';
const HISTORY_KEY = 'heat_alert_history';
const COOLDOWN_MS = 3 * 60 * 60 * 1000; // don't repeat the same alert within 3 hours

let setupDone = false;

export const ensureNotificationSetup = async () => {
  if (setupDone) return;
  await notifee.requestPermission();
  await notifee.createChannel({
    id: CHANNEL_ID,
    name: 'Heat Alerts',
    importance: AndroidImportance.HIGH,
  });
  setupDone = true;
};

const displayAlert = async (alert: HeatAlert) => {
  await notifee.displayNotification({
    title: alert.title,
    body: alert.body,
    android: {
      channelId: CHANNEL_ID,
      pressAction: { id: 'default' },
    },
  });
};

// Only delivers alerts that are new or whose cooldown has expired —
// prevents the same condition from spamming a notification every check cycle.
export const deliverNewAlerts = async (alerts: HeatAlert[]): Promise<void> => {
  if (alerts.length === 0) return;

  let history: Record<string, number> = {};
  try {
    const raw = await AsyncStorage.getItem(HISTORY_KEY);
    history = raw ? JSON.parse(raw) : {};
  } catch (error) {
    console.log('Failed to read alert history:', error);
  }

  const now = Date.now();
  let historyChanged = false;

  for (const alert of alerts) {
    const lastFired = history[alert.id];
    if (lastFired && now - lastFired < COOLDOWN_MS) continue;

    await displayAlert(alert);
    history[alert.id] = now;
    historyChanged = true;
  }

  // Prune entries older than 48h so storage doesn't grow unbounded
  const prunedHistory: Record<string, number> = {};
  for (const [id, timestamp] of Object.entries(history)) {
    if (now - timestamp < 48 * 60 * 60 * 1000) {
      prunedHistory[id] = timestamp;
    }
  }

  if (historyChanged) {
    try {
      await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(prunedHistory));
    } catch (error) {
      console.log('Failed to save alert history:', error);
    }
  }
};

// Bypasses the cooldown entirely — for the "Send Test Notification" button
export const sendTestNotification = async () => {
  await ensureNotificationSetup();
  await displayAlert({
    id: 'test',
    category: 'current_threshold',
    title: 'Test Alert: Very Hot (38°C)',
    body: 'This is a test notification. Real alerts will look like this.',
  });
};
