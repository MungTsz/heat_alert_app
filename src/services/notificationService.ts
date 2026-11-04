// src/services/notificationService.ts
import notifee, { AndroidImportance, AndroidStyle } from '@notifee/react-native';
import { AlertMessage } from '../types/alerts';

// The existing channel id is kept so users' per-channel system settings
// carry over; createChannel updates its name. Urgent alerts get their own
// channel so people can keep those loud even if they quieten the rest.
const CHANNELS = {
  normal: { id: 'heat-alerts', name: 'Heat & air quality alerts' },
  urgent: { id: 'urgent-alerts', name: 'Urgent heat & air quality alerts' },
};

let setupDone = false;

export const ensureNotificationSetup = async () => {
  if (setupDone) return;
  await notifee.requestPermission();
  await notifee.createChannel({
    id: CHANNELS.normal.id,
    name: CHANNELS.normal.name,
    importance: AndroidImportance.HIGH,
  });
  await notifee.createChannel({
    id: CHANNELS.urgent.id,
    name: CHANNELS.urgent.name,
    importance: AndroidImportance.HIGH,
    vibration: true,
  });
  setupDone = true;
};

// Shows one message. De-duplication and timing are decided upstream by the
// event machine and delivery rules — this layer only displays.
export const displayAlertMessage = async (message: AlertMessage): Promise<void> => {
  await notifee.displayNotification({
    title: message.title,
    body: message.body,
    android: {
      channelId: message.urgent ? CHANNELS.urgent.id : CHANNELS.normal.id,
      pressAction: { id: 'default' },
      // Long merged bodies stay readable when expanded.
      style: { type: AndroidStyle.BIGTEXT, text: message.body },
    },
  });
};
