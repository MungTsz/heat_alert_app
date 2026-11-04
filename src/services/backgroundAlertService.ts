// src/services/backgroundAlertService.ts
import BackgroundFetch, { HeadlessEvent } from 'react-native-background-fetch';
import notifee, { Event, EventType } from '@notifee/react-native';
import { BACKGROUND_ALERT_CONFIG } from '../config/alertConfig';
import { nextDigest } from '../utils/alertDigest';
import { runAlertCheck } from './alertCheckService';
import { readNotificationSettings } from './notificationSettingsStorage';
import { readLastKnownLocation, writePendingAlertOpen } from './alertStateStorage';
import { ALERT_MESSAGE_ID_KEY } from './notificationService';

// Runs the same alert check while the app is closed, so the evening
// heads-up and morning reminder arrive on time and a breach is caught
// without the app open. On-device by design for now (Android: reliable via
// JobScheduler/AlarmManager; iOS: best effort, the OS picks the times) —
// server push is the later, sturdier option.

// Shortest delay worth scheduling — a digest due "now" is already handled
// by the run that is scheduling it.
const MIN_TASK_DELAY_MS = 60 * 1000;

const runBackgroundCheck = async (): Promise<void> => {
  const coords = await readLastKnownLocation(
    Date.now(),
    BACKGROUND_ALERT_CONFIG.lastLocationMaxAgeMs,
  );
  await runAlertCheck({ coords });
  await scheduleNextDigestTask();
};

// The OS gives a background task a limited time and must be told when it
// is done, whatever happened — or it stops scheduling the app.
const handleTask = async (taskId: string): Promise<void> => {
  try {
    await runBackgroundCheck();
  } catch (error) {
    console.log('Background alert check failed:', error);
  } finally {
    BackgroundFetch.finish(taskId);
  }
};

// A one-shot task at the next digest time, replacing any earlier one, so
// the digest doesn't wait on the periodic check's jitter. Called after
// every check and whenever digest settings change.
export const scheduleNextDigestTask = async (): Promise<void> => {
  const { digestTaskId } = BACKGROUND_ALERT_CONFIG;
  try {
    // stop() with no id would stop ALL background fetch — always pass it.
    await BackgroundFetch.stop(digestTaskId);
  } catch {
    // Nothing scheduled yet.
  }
  const next = nextDigest(Date.now(), await readNotificationSettings());
  if (!next) return;
  try {
    await BackgroundFetch.scheduleTask({
      taskId: digestTaskId,
      delay: Math.max(next.atMs - Date.now(), MIN_TASK_DELAY_MS),
      periodic: false,
      // JobScheduler treats delay as a minimum and may batch it much later;
      // AlarmManager keeps a digest near the time the user picked.
      forceAlarmManager: true,
      stopOnTerminate: false,
      startOnBoot: true,
      enableHeadless: true,
    });
  } catch (error) {
    console.log('Failed to schedule digest task:', error);
  }
};

let started = false;

// Called once from the foreground app (AlertEngine).
export const startBackgroundAlerts = async (): Promise<void> => {
  if (started) return;
  started = true;
  try {
    await BackgroundFetch.configure(
      {
        minimumFetchInterval: BACKGROUND_ALERT_CONFIG.minimumFetchIntervalMinutes,
        stopOnTerminate: false,
        startOnBoot: true,
        enableHeadless: true,
        requiredNetworkType: BackgroundFetch.NETWORK_TYPE_ANY,
      },
      handleTask,
      taskId => BackgroundFetch.finish(taskId),
    );
    await scheduleNextDigestTask();
  } catch (error) {
    started = false;
    console.log('Background alerts unavailable:', error);
  }
};

export const alertMessageIdOf = (event: Event): string | null => {
  const id = event.detail.notification?.data?.[ALERT_MESSAGE_ID_KEY];
  return typeof id === 'string' ? id : null;
};

// Called from index.js, before the app registers — both handlers must exist
// when Android starts the JS runtime without UI (app closed).
export const registerAlertBackgroundHandlers = (): void => {
  // Android: the app was terminated; the task runs headless.
  BackgroundFetch.registerHeadlessTask(async (event: HeadlessEvent) => {
    if (event.timeout) {
      BackgroundFetch.finish(event.taskId);
      return;
    }
    await handleTask(event.taskId);
  });

  // A notification tapped while the app is in the background: park the
  // message id; the app opens its detail sheet when it comes forward.
  notifee.onBackgroundEvent(async event => {
    if (event.type !== EventType.PRESS) return;
    const messageId = alertMessageIdOf(event);
    if (messageId) await writePendingAlertOpen(messageId);
  });
};

