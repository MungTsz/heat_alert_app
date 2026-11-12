import { useCallback, useEffect, useState } from 'react';
import { NotificationSettings } from '../types/settings';
import { DEFAULT_NOTIFICATION_SETTINGS } from '../config/alertConfig';
import {
  readNotificationSettings,
  writeNotificationSettings,
} from '../services/notificationSettingsStorage';
import { scheduleNextDigestTask } from '../services/backgroundAlertService';

// Every mounted instance hears about a change made through any other one —
// e.g. the first-launch question (mounted at the root) and the Alerts tab's About
// you row must never disagree about who the owner is.
const listeners = new Set<(settings: NotificationSettings) => void>();

export const useNotificationSettings = () => {
  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_NOTIFICATION_SETTINGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    readNotificationSettings()
      .then(stored => {
        if (isMounted) setSettings(stored);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });
    listeners.add(setSettings);
    return () => {
      isMounted = false;
      listeners.delete(setSettings);
    };
  }, []);

  // One setter for every field: each Settings control changes a single
  // field, and the alert check re-reads storage on its next tick.
  const update = useCallback(
    async (patch: Partial<NotificationSettings>) => {
      const updated = { ...settings, ...patch };
      listeners.forEach(listener => listener(updated));
      await writeNotificationSettings(updated);
      // A changed digest time must move the scheduled background task now,
      // not at the next check.
      if (patch.digests) await scheduleNextDigestTask();
    },
    [settings],
  );

  return { settings, loading, update };
};
