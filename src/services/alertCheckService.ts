// src/services/alertCheckService.ts
import { AlertEvent } from '../types/alerts';
import { BookmarkEntry } from '../types/bookmark';
import { NotificationSettings } from '../types/settings';
import { CURRENT_LOCATION_PLACE_ID, HAZARD_KINDS } from '../config/alertConfig';
import { CURRENT_LOCATION_LABEL } from '../config/alertCopy';
import { readBookmarks } from './bookmarkStorage';
import { readNotificationSettings } from './notificationSettingsStorage';
import {
  clearLegacyAlertHistory,
  readAlertEvents,
  readDeliveryLog,
  writeAlertEvents,
  writeDeliveryLog,
} from './alertStateStorage';
import { fetchPlaceReadings } from './alertReadings';
import { displayAlertMessage, ensureNotificationSetup } from './notificationService';
import { resolveAlertProfile } from '../utils/alertProfile';
import { buildHazardSignal } from '../utils/alertSignals';
import { advanceEvent, markNoticeDelivered } from '../utils/alertEvents';
import {
  applyDailyCap,
  countSentToday,
  pruneDeliveryLog,
  selectDueEvents,
} from '../utils/alertDelivery';
import { AlertPlace, buildSampleMessage, composeMessages } from '../utils/alertMessages';

type Coordinates = { latitude: number; longitude: number };
type CheckedPlace = AlertPlace & { coords: Coordinates };

export type AlertCheckOptions = {
  // The phone's real position; null skips the current-location place
  // rather than alerting on a fallback spot the user isn't at.
  coords: Coordinates | null;
  // Skip the batching wait — for the manual "run check now" button.
  flush?: boolean;
};

// The whole check as one plain async function: it reads places and
// settings from storage itself and takes only the position as input, so a
// background task (or, later, a server) can run it without React.
//
// Pipeline: readings → signals → event machine → delivery rules →
// messages → daily cap → display → record what was told.

const buildPlaces = (
  settings: NotificationSettings,
  bookmarks: readonly BookmarkEntry[],
  coords: Coordinates | null,
): CheckedPlace[] => {
  const places: CheckedPlace[] = [];
  if (settings.notifyCurrentLocation && coords) {
    places.push({
      id: CURRENT_LOCATION_PLACE_ID,
      label: CURRENT_LOCATION_LABEL,
      profile: settings.currentLocationProfile,
      coords,
    });
  }
  if (settings.notifyBookmarkedLocations) {
    // Hidden places still alert: hiding only tidies the Community list.
    for (const b of bookmarks) {
      places.push({
        id: b.id,
        label: b.label,
        profile: resolveAlertProfile(b.alertProfile),
        coords: { latitude: b.latitude, longitude: b.longitude },
      });
    }
  }
  return places;
};

const runCheckOnce = async ({ coords, flush }: AlertCheckOptions): Promise<void> => {
  await ensureNotificationSetup();
  await clearLegacyAlertHistory();
  const nowMs = Date.now();

  const [settings, bookmarks, previousEvents, log] = await Promise.all([
    readNotificationSettings(),
    readBookmarks(),
    readAlertEvents(),
    readDeliveryLog(),
  ]);
  const places = buildPlaces(settings, bookmarks, coords);
  const readings = await Promise.all(
    places.map(place => fetchPlaceReadings(place.coords, place.profile.hazards)),
  );

  // Only enabled place × hazard pairs get a signal, so events for a deleted
  // place or a switched-off hazard simply aren't carried forward.
  const previousByKey = new Map(previousEvents.map(ev => [ev.key, ev]));
  const advanced: AlertEvent[] = places.flatMap((place, i) =>
    HAZARD_KINDS.filter(hazard => place.profile.hazards[hazard]).flatMap(hazard => {
      const signal = buildHazardSignal({
        placeId: place.id,
        hazard,
        profile: place.profile,
        reading: readings[i][hazard],
        allClear: settings.allClear,
        nowMs,
      });
      const next = advanceEvent(previousByKey.get(signal.key) ?? null, signal, nowMs);
      return next ? [next] : [];
    }),
  );

  const { events, due } = selectDueEvents(advanced, {
    nowMs,
    quietHours: settings.quietHours,
    flush,
  });
  const placesById = Object.fromEntries(places.map(place => [place.id, place]));
  const messages = applyDailyCap(
    composeMessages(due, placesById, nowMs),
    countSentToday(log, nowMs),
  );

  const deliveredKeys = new Set<string>();
  const nextLog = [...log];
  for (const message of messages) {
    try {
      await displayAlertMessage(message);
      message.eventKeys.forEach(key => deliveredKeys.add(key));
      nextLog.push({ atMs: nowMs, urgent: message.urgent });
    } catch (error) {
      // Left pending — the next tick tries again.
      console.log('Failed to show alert:', error);
    }
  }

  const finalEvents = events.flatMap(ev => {
    if (!deliveredKeys.has(ev.key)) return [ev];
    const told = markNoticeDelivered(ev, nowMs);
    return told ? [told] : [];
  });
  await Promise.all([
    writeAlertEvents(finalEvents),
    writeDeliveryLog(pruneDeliveryLog(nextLog, nowMs)),
  ]);
};

// Ticks and the manual button can overlap; a second call while one is
// running shares it instead of reading and writing event state twice.
let inFlight: Promise<void> | null = null;

export const runAlertCheck = (options: AlertCheckOptions): Promise<void> => {
  if (!inFlight) {
    inFlight = runCheckOnce(options)
      .catch(error => console.log('Alert check failed:', error))
      .finally(() => {
        inFlight = null;
      });
  }
  return inFlight;
};

// "Preview a notification": a sample heads-up worded for the user's own
// first place (or their location), shown immediately and outside the event
// machine, so it never counts towards the daily cap.
export const sendSampleNotification = async (): Promise<void> => {
  await ensureNotificationSetup();
  const [settings, bookmarks] = await Promise.all([readNotificationSettings(), readBookmarks()]);
  const firstPlace = bookmarks.find(b => !b.hidden);
  const place: AlertPlace = firstPlace
    ? { id: firstPlace.id, label: firstPlace.label, profile: resolveAlertProfile(firstPlace.alertProfile) }
    : { id: CURRENT_LOCATION_PLACE_ID, label: CURRENT_LOCATION_LABEL, profile: settings.currentLocationProfile };
  await displayAlertMessage(buildSampleMessage(place, Date.now()));
};
