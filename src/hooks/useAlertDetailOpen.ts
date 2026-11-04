// src/hooks/useAlertDetailOpen.ts
import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import notifee, { EventType } from '@notifee/react-native';
import { onOpenAlertDetail } from '../services/alertCheckBus';
import { takePendingAlertOpen } from '../services/alertStateStorage';
import { alertMessageIdOf } from '../services/backgroundAlertService';
import { ALERT_MESSAGE_ID_KEY } from '../services/notificationService';

// getInitialNotification reports the notification that cold-started the
// app; ask once per JS runtime so returning to the app doesn't reopen it.
let initialChecked = false;
const takeInitialNotificationId = async (): Promise<string | null> => {
  if (initialChecked) return null;
  initialChecked = true;
  const initial = await notifee.getInitialNotification();
  const id = initial?.notification.data?.[ALERT_MESSAGE_ID_KEY];
  return typeof id === 'string' ? id : null;
};

// Which alert message's detail sheet is open, from any of the three ways
// in: a notification tapped with the app open, one tapped while it was in
// the background or closed, or a badge tapped on a card.
export const useAlertDetailOpen = () => {
  const [messageId, setMessageId] = useState<string | null>(null);

  useEffect(() => onOpenAlertDetail(setMessageId), []);

  useEffect(
    () =>
      notifee.onForegroundEvent(event => {
        if (event.type !== EventType.PRESS) return;
        const id = alertMessageIdOf(event);
        if (id) setMessageId(id);
      }),
    [],
  );

  useEffect(() => {
    const check = async () => {
      const id = (await takeInitialNotificationId()) ?? (await takePendingAlertOpen());
      if (id) setMessageId(id);
    };
    check();
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') check();
    });
    return () => subscription.remove();
  }, []);

  const close = useCallback(() => setMessageId(null), []);
  return { messageId, close };
};
