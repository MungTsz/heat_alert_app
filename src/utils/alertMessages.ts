// src/utils/alertMessages.ts
import {
  AdviceGroup,
  AlertEvent,
  AlertMessage,
  AlertMessageGroup,
  AlertMessageRecord,
  AlertPerson,
  CaringFor,
  HazardKind,
  PlaceAlertProfile,
} from '../types/alerts';
import { DigestSlot, NoEventDays } from '../types/settings';
import {
  ALERT_DELIVERY_CONFIG,
  ALERT_MESSAGE_CONFIG,
  ALERT_MESSAGE_PRIORITY,
  HAZARD_KINDS,
  SAMPLE_PREVIEW_HK_HOUR,
  SAMPLE_PREVIEW_HOURS,
} from '../config/alertConfig';
import {
  AQHI_ADVICE,
  AQHI_URGENT_ADVICE,
  CANCELLED_CLOSING,
  CLEARED_CLOSING,
  DETAIL_COPY,
  DUAL_ADVICE,
  HEAT_ADVICE,
  HEAT_URGENT_ADVICE,
  MESSAGE_COPY,
  PLACE_LIST_COPY,
  REMINDER_COPY,
  TIME_COPY,
} from '../config/alertCopy';
import { addHkDays, diffHkDays, parseHkTimestamp, toHkDateKey, toHkTimestamp } from './hkDate';
import { formatHazardValue, levelAtRank, levelOf } from './hazardLevels';
import { noticeGroupOf } from './alertEvents';
import { adviceGroupFor, personOf, urgentRankFor } from './alertProfile';

// Turns due notices into push notifications. Structure from Sutton's
// complete-warning elements, trimmed for a lock screen: what and how bad
// (title), where and when (the facts), then one concrete action. Every word
// comes from alertCopy.ts.

const HOUR_MS = 60 * 60 * 1000;

export type AlertPlace = {
  id: string;
  label: string;
  profile: PlaceAlertProfile;
  // Kept on the message record so the detail sheet can chart the place.
  coords?: { latitude: number; longitude: number };
};

// A message before its body is assembled. Facts and action are kept apart
// so a digest merging several parts can list every part's facts and still
// end with one action, instead of repeating advice line after line. The
// action is built from whose places the message covers — a digest covering
// more places than its lead part re-words it for all of them.
type MessagePart = Omit<AlertMessage, 'id' | 'body'> & {
  facts: string;
  profiles: AdviceSource[];
  actionFor: (profile: AdviceProfile) => string;
};

const joinBody = (facts: string, action: string | null): string =>
  action ? `${facts} ${action}` : facts;

const toMessage = (part: MessagePart, id: string): AlertMessage => ({
  id,
  group: part.group,
  priority: part.priority,
  urgent: part.urgent,
  title: part.title,
  body: joinBody(part.facts, part.actionFor(adviceProfileFor(part.profiles))),
  eventKeys: part.eventKeys,
});

// "Mum's home", "Home and Office", "Home, Office and School",
// "Home, Office, School and 2 more places".
export const formatPlaceList = (labels: readonly string[]): string => {
  const unique = Array.from(new Set(labels));
  const max = ALERT_DELIVERY_CONFIG.maxPlacesInMessage;
  const shown = unique.length > max ? unique.slice(0, max) : unique;
  const items =
    unique.length > max ? [...shown, PLACE_LIST_COPY.more(unique.length - max)] : shown;
  if (items.length <= 1) return items[0] ?? '';
  return `${items.slice(0, -1).join(', ')}${PLACE_LIST_COPY.and}${items[items.length - 1]}`;
};

// "High (7)", "Danger (41°C)"
export const describeValue = (hazard: HazardKind, value: number): string =>
  `${levelOf(hazard, value)} (${formatHazardValue(hazard, value)})`;

// "up to Very High (10)" — the worst point of a forecast, used where two
// hazards share a sentence and a full range for each would not fit.
export const describePeak = (hazard: HazardKind, max: number): string =>
  MESSAGE_COPY.upTo(describeValue(hazard, max));

// "High to Very High (7-10)", "Very High (8)", "Extreme Caution to Danger
// (up to 41°C)". Heat states only the peak — a °C span reads like a
// temperature forecast, which the heat index is not.
export const describeRange = (hazard: HazardKind, min: number, max: number): string => {
  const minLevel = levelOf(hazard, min);
  const maxLevel = levelOf(hazard, max);
  const levels = minLevel === maxLevel ? maxLevel : `${minLevel} to ${maxLevel}`;
  const minText = formatHazardValue(hazard, min);
  const maxText = formatHazardValue(hazard, max);
  const values =
    hazard === 'heat' ? `up to ${maxText}` : minText === maxText ? maxText : `${minText}-${maxText}`;
  return `${levels} (${values})`;
};

const hkHour = (ms: number): number => Number(toHkTimestamp(new Date(ms)).slice(8, 10));

const formatHkClock = (ms: number): string => {
  const hour = hkHour(ms);
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${hour12} ${hour < 12 ? TIME_COPY.am : TIME_COPY.pm}`;
};

// A window's end falls on the hour after its last hour, so a run ending at
// 23:00 ends at midnight — "to midnight", not "to 12 am tomorrow".
const formatEndClock = (endMs: number): string =>
  hkHour(endMs) === 0 ? TIME_COPY.midnight : formatHkClock(endMs);

// "today", "tomorrow" or "on Fri", in Hong Kong time.
export const describeDay = (ms: number, nowMs: number): string => {
  const dayKey = toHkDateKey(new Date(ms));
  const dayDiff = diffHkDays(toHkDateKey(new Date(nowMs)), dayKey);
  return dayDiff <= 0
    ? TIME_COPY.today
    : dayDiff === 1
      ? TIME_COPY.tomorrow
      : TIME_COPY.onWeekday(TIME_COPY.weekdays[new Date(`${dayKey}T00:00:00Z`).getUTCDay()]);
};

// "from about 2 pm tomorrow". Hour precision only — forecast data is
// hourly, and "about" keeps it honest.
export const describeStart = (startMs: number, nowMs: number): string =>
  TIME_COPY.from(formatHkClock(startMs), describeDay(startMs, nowMs));

// "from about 2 pm to 6 pm tomorrow", or "from about 10 pm today to 3 am
// tomorrow" across midnight. The design doc asks for the start AND end, so
// people know when normal plans can resume.
export const describeWindow = (startMs: number, endMs: number, nowMs: number): string => {
  const startDay = describeDay(startMs, nowMs);
  // The end instant itself may be the next midnight; the day it closes is
  // the day of its last hour.
  const endDay = describeDay(endMs - 1, nowMs);
  return startDay === endDay
    ? TIME_COPY.window(formatHkClock(startMs), formatEndClock(endMs), startDay)
    : TIME_COPY.windowAcrossDays(formatHkClock(startMs), startDay, formatEndClock(endMs), endDay);
};

// "Sent 7:35 pm today" — minute precision, since it is a real send time.
export const describeSentAt = (sentMs: number, nowMs: number): string => {
  const date = new Date(sentMs);
  const hour = hkHour(sentMs);
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  const clock = `${hour12}:${String(date.getUTCMinutes()).padStart(2, '0')} ${
    hour < 12 ? TIME_COPY.am : TIME_COPY.pm
  }`;
  const dayKey = toHkDateKey(date);
  const dayDiff = diffHkDays(dayKey, toHkDateKey(new Date(nowMs)));
  const day =
    dayDiff <= 0
      ? TIME_COPY.today
      : dayDiff === 1
        ? TIME_COPY.yesterday
        : TIME_COPY.onWeekday(TIME_COPY.weekdays[new Date(`${dayKey}T00:00:00Z`).getUTCDay()]);
  return DETAIL_COPY.sentAt(clock, day);
};

// Whoever a message's advice is for: a place's (or About you's) answers
// and who it is set up for — a PlaceAlertProfile or an AlertDetailItem.
export type AdviceSource = AlertPerson & { caringFor: CaringFor };

// The advice a message gives: which sentence per hazard, in whose voice.
export type AdviceProfile = { groups: Record<HazardKind, AdviceGroup>; caringFor: CaringFor };

// Several places' advice groups for one hazard, merged: the shared one if
// they agree, otherwise the careful one if anyone needs it, otherwise the
// everyday one — outdoor-work advice never stands in for an office.
const mergeAdviceGroups = (groups: readonly AdviceGroup[]): AdviceGroup => {
  const distinct = new Set(groups);
  if (distinct.size === 1) return groups[0];
  return distinct.has('sensitive') ? 'sensitive' : 'general';
};

// Whose advice a merged message gives. One message may cover Mum's home
// (family, older adult) and the Office (self, general): speak to a carer
// ("call them") only when EVERY place is set up for family, and when the
// places' answers differ, give the more careful advice if anyone needs it.
export const adviceProfileFor = (profiles: readonly AdviceSource[]): AdviceProfile => {
  const groups = Object.fromEntries(
    HAZARD_KINDS.map(hazard => [
      hazard,
      mergeAdviceGroups(profiles.map(p => adviceGroupFor(p, hazard))),
    ]),
  ) as Record<HazardKind, AdviceGroup>;
  const caringFor: CaringFor =
    profiles.length > 0 && profiles.every(p => p.caringFor === 'family') ? 'family' : 'self';
  return { groups, caringFor };
};

// The one action sentence for a message — also shown in the detail sheet,
// so the sheet never words the advice differently from the push.
export const adviceFor = (
  hazards: readonly HazardKind[],
  profile: AdviceProfile,
  severe: boolean,
): string => {
  const voice = profile.caringFor;
  if (hazards.length > 1) return DUAL_ADVICE[voice];
  if (hazards[0] === 'aqhi') {
    return severe ? AQHI_URGENT_ADVICE[voice] : AQHI_ADVICE[profile.groups.aqhi][voice];
  }
  return severe ? HEAT_URGENT_ADVICE[voice] : HEAT_ADVICE[profile.groups.heat][voice];
};

// Worst first, so the title and the first-named place come from the place
// that needs the most attention.
const byConcern = (a: AlertEvent, b: AlertEvent) =>
  Number(b.pending!.urgent) - Number(a.pending!.urgent) || b.pending!.rank - a.pending!.rank;

const groupPriority = (group: AlertMessageGroup, events: readonly AlertEvent[]): number => {
  if (events.some(ev => ev.pending!.urgent)) return ALERT_MESSAGE_PRIORITY.urgent;
  switch (group) {
    case 'live':
      return events.some(ev => ev.pending!.kind === 'escalation')
        ? ALERT_MESSAGE_PRIORITY.escalation
        : ALERT_MESSAGE_PRIORITY.breaking;
    case 'preview':
      return ALERT_MESSAGE_PRIORITY.preview;
    case 'cancelled':
      return ALERT_MESSAGE_PRIORITY.cancelled;
    case 'cleared':
      return ALERT_MESSAGE_PRIORITY.cleared;
  }
};

const valueOrLevel = (ev: AlertEvent): string =>
  ev.latestValue === null
    ? levelAtRank(ev.hazard, ev.pending!.rank)
    : describeValue(ev.hazard, ev.latestValue);

// After an event eases, its last level is unknown without a reading; say
// "below your alert level" rather than guess the mildest level.
const clearedLevel = (ev: AlertEvent | undefined): string =>
  ev && ev.latestValue !== null
    ? describeValue(ev.hazard, ev.latestValue)
    : MESSAGE_COPY.belowAlertLevel;

const placesOf = (events: readonly AlertEvent[], places: Record<string, AlertPlace>) => {
  const seen = new Set<string>();
  return events.flatMap(ev => {
    const place = places[ev.placeId];
    if (!place || seen.has(place.id)) return [];
    seen.add(place.id);
    return [place];
  });
};

const composeGroup = (
  group: AlertMessageGroup,
  events: AlertEvent[],
  places: Record<string, AlertPlace>,
  nowMs: number,
): MessagePart | null => {
  const sorted = [...events].sort(byConcern);
  const lead = sorted[0];
  const involved = placesOf(sorted, places);
  if (!places[lead.placeId]) return null;

  const hazards = HAZARD_KINDS.filter(h => sorted.some(ev => ev.hazard === h));
  const placeText = formatPlaceList(involved.map(p => p.label));
  const firstOf = (h: HazardKind) => sorted.find(ev => ev.hazard === h);
  const severe = lead.pending!.rank >= urgentRankFor(lead.hazard);
  const dual = hazards.length > 1;

  let title: string;
  let facts: string;
  let actionFor = (p: AdviceProfile) => adviceFor(hazards, p, severe);
  switch (group) {
    case 'live': {
      if (dual) {
        title = MESSAGE_COPY.dualLiveTitle;
        facts = MESSAGE_COPY.dualLiveBody(
          placeText,
          valueOrLevel(firstOf('aqhi')!),
          valueOrLevel(firstOf('heat')!),
        );
      } else {
        const level = valueOrLevel(lead);
        const escalated = sorted.some(ev => ev.pending!.kind === 'escalation');
        title = escalated
          ? MESSAGE_COPY.escalationTitle(lead.hazard, level)
          : MESSAGE_COPY.breakingTitle(lead.hazard, level);
        facts = escalated
          ? MESSAGE_COPY.escalationBody(placeText, level)
          : MESSAGE_COPY.breakingBody(placeText, level);
      }
      break;
    }
    case 'preview': {
      const withForecast = sorted.filter(ev => ev.forecast !== null);
      if (withForecast.length === 0) return null;
      const startMs = Math.min(...withForecast.map(ev => ev.forecast!.startMs));
      const endMs = Math.max(...withForecast.map(ev => ev.forecast!.endMs));
      const when = describeWindow(startMs, endMs, nowMs);
      // A message made only of updates says so; a fresh heads-up mixed in
      // makes the whole message a plain heads-up.
      const isUpdate = sorted.every(ev => ev.pending!.kind === 'escalation');
      const peakOf = (h: HazardKind) =>
        Math.max(...withForecast.filter(ev => ev.hazard === h).map(ev => ev.forecast!.maxValue));
      const forecastHazards = HAZARD_KINDS.filter(h => withForecast.some(ev => ev.hazard === h));
      if (forecastHazards.length > 1) {
        title = isUpdate ? MESSAGE_COPY.dualPreviewUpdateTitle : MESSAGE_COPY.dualPreviewTitle;
        facts = MESSAGE_COPY.dualPreviewBody(
          placeText,
          describePeak('aqhi', peakOf('aqhi')),
          describePeak('heat', peakOf('heat')),
          when,
        );
      } else {
        const hazard = forecastHazards[0];
        const min = Math.min(...withForecast.map(ev => ev.forecast!.minValue));
        const max = peakOf(hazard);
        const level = levelOf(hazard, max);
        const range = describeRange(hazard, min, max);
        if (isUpdate) {
          // An update is either worse than what was told or (same level)
          // moved earlier — the event machine only sends those two.
          const worse = sorted.some(ev => ev.pending!.rank > ev.toldRank);
          title = MESSAGE_COPY.previewUpdateTitle(hazard, level);
          facts = MESSAGE_COPY.previewUpdateBody(
            placeText,
            range,
            when,
            worse ? MESSAGE_COPY.updateWorse : MESSAGE_COPY.updateEarlier,
          );
        } else {
          title = MESSAGE_COPY.previewTitle(hazard, level);
          facts = MESSAGE_COPY.previewBody(placeText, range, when);
        }
      }
      break;
    }
    case 'cancelled': {
      title = MESSAGE_COPY.cancelledTitle(hazards);
      const peaks = sorted.map(ev => ev.cancelledPeakValue ?? null);
      const toldStarts = sorted.map(ev => ev.toldStartMs);
      // Name the new outlook only when it is one hazard and known for every
      // place; otherwise the plain version is still true.
      facts =
        !dual && peaks.every(p => p !== null) && toldStarts.every(t => t !== null)
          ? MESSAGE_COPY.cancelledBody(
              placeText,
              lead.hazard,
              describeDay(Math.min(...(toldStarts as number[])), nowMs),
              describeValue(lead.hazard, Math.max(...(peaks as number[]))),
            )
          : MESSAGE_COPY.cancelledGenericBody(placeText);
      actionFor = p => CANCELLED_CLOSING[p.caringFor];
      break;
    }
    case 'cleared':
      title = MESSAGE_COPY.clearedTitle(hazards);
      facts = dual
        ? MESSAGE_COPY.dualClearedBody(
            placeText,
            clearedLevel(firstOf('aqhi')),
            clearedLevel(firstOf('heat')),
          )
        : MESSAGE_COPY.clearedBody(placeText, clearedLevel(lead));
      actionFor = p => CLEARED_CLOSING[p.caringFor];
      break;
  }

  return {
    group,
    priority: groupPriority(group, sorted),
    urgent: sorted.some(ev => ev.pending!.urgent),
    title,
    facts,
    profiles: involved.map(p => p.profile),
    actionFor,
    eventKeys: sorted.map(ev => ev.key),
  };
};

const GROUP_ORDER: readonly AlertMessageGroup[] = ['live', 'preview', 'cancelled', 'cleared'];

const composeParts = (
  due: readonly AlertEvent[],
  places: Record<string, AlertPlace>,
  nowMs: number,
): MessagePart[] =>
  GROUP_ORDER.flatMap(group => {
    const events = due.filter(ev => noticeGroupOf(ev) === group);
    if (events.length === 0) return [];
    const part = composeGroup(group, events, places, nowMs);
    return part ? [part] : [];
  });

// One message per group, each merging every place and both hazards — so a
// citywide episode reads as one push, not one per place.
export const composeMessages = (
  due: readonly AlertEvent[],
  places: Record<string, AlertPlace>,
  nowMs: number,
): AlertMessage[] =>
  composeParts(due, places, nowMs).map(part => toMessage(part, `${part.group}:${nowMs}`));

// What a heads-up for this place would look like. Uses the dual-hazard
// template with no numbers in it, so the sample can never be mistaken for
// a real reading, and it shows both hazards equally.
export const buildSampleMessage = (place: AlertPlace, nowMs: number): AlertMessage => {
  const tomorrow = addHkDays(toHkDateKey(new Date(nowMs)), 1).replace(/-/g, '');
  const startMs = parseHkTimestamp(`${tomorrow}${String(SAMPLE_PREVIEW_HK_HOUR).padStart(2, '0')}`);
  const endMs = startMs + SAMPLE_PREVIEW_HOURS * HOUR_MS;
  return {
    id: `sample:${nowMs}`,
    group: 'sample',
    priority: ALERT_MESSAGE_PRIORITY.preview,
    urgent: false,
    title: `${MESSAGE_COPY.samplePrefix}${MESSAGE_COPY.dualPreviewTitle}`,
    body: joinBody(
      MESSAGE_COPY.sampleBody(place.label, describeWindow(startMs, endMs, nowMs)),
      DUAL_ADVICE[place.profile.caringFor],
    ),
    eventKeys: [],
  };
};

// ---- Scheduled digests ----------------------------------------------------

const levelTextOf = (ev: AlertEvent): string =>
  ev.latestValue === null
    ? levelAtRank(ev.hazard, Math.max(ev.toldRank, 0))
    : describeValue(ev.hazard, ev.latestValue);

// Today's level for one event: the reading if it's under way, the
// forecast's worst point if it's still to come.
const todayLevelOf = (ev: AlertEvent): string =>
  ev.stage === 'forecast' && ev.forecast
    ? describePeak(ev.hazard, ev.forecast.maxValue)
    : levelTextOf(ev);

// The morning reminder about TODAY: events the user already knows about
// that matter today — an episode still going (with "day N" for multi-day
// ones) or a heads-up starting today. A reminder re-tells; it never changes
// event state.
const composeTodayReminderPart = (
  events: readonly AlertEvent[],
  places: Record<string, AlertPlace>,
  nowMs: number,
): MessagePart | null => {
  const today = toHkDateKey(new Date(nowMs));
  const relevant = events
    .filter(
      ev =>
        ev.toldRank >= 0 &&
        places[ev.placeId] !== undefined &&
        (ev.stage === 'active' ||
          (ev.stage === 'forecast' &&
            ev.forecast !== null &&
            toHkDateKey(new Date(ev.forecast.startMs)) === today)),
    )
    .sort((a, b) => b.toldRank - a.toldRank);
  if (relevant.length === 0) return null;

  const lead = relevant[0];
  const hazards = HAZARD_KINDS.filter(h => relevant.some(ev => ev.hazard === h));
  const involved = placesOf(relevant, places);
  const placeText = formatPlaceList(involved.map(p => p.label));
  const severe = lead.toldRank >= urgentRankFor(lead.hazard);

  let title: string;
  let facts: string;
  if (hazards.length > 1) {
    // Sorted worst first, so find() picks each hazard's worst event.
    const worstOf = (h: HazardKind) => relevant.find(ev => ev.hazard === h)!;
    title = REMINDER_COPY.dualTitle;
    facts = REMINDER_COPY.dualBody(
      placeText,
      todayLevelOf(worstOf('aqhi')),
      todayLevelOf(worstOf('heat')),
    );
  } else {
    const ongoing = relevant.find(ev => ev.stage === 'active');
    if (ongoing) {
      const day = diffHkDays(toHkDateKey(new Date(ongoing.openedAtMs)), today) + 1;
      title = REMINDER_COPY.title(ongoing.hazard, levelAtRank(ongoing.hazard, ongoing.toldRank));
      facts = REMINDER_COPY.ongoingBody(placeText, levelTextOf(ongoing), day);
    } else {
      const windows = relevant.map(ev => ev.forecast!);
      const min = Math.min(...windows.map(w => w.minValue));
      const max = Math.max(...windows.map(w => w.maxValue));
      const startMs = Math.min(...windows.map(w => w.startMs));
      const endMs = Math.max(...windows.map(w => w.endMs));
      const range = describeRange(lead.hazard, min, max);
      title = REMINDER_COPY.title(lead.hazard, levelOf(lead.hazard, max));
      facts =
        startMs - nowMs >= ALERT_MESSAGE_CONFIG.fineUntilMinLeadMs
          ? REMINDER_COPY.fineUntilBody(placeText, formatHkClock(startMs), range, formatEndClock(endMs))
          : REMINDER_COPY.forecastBody(placeText, range, describeWindow(startMs, endMs, nowMs));
    }
  }
  return {
    group: 'reminder',
    priority: ALERT_MESSAGE_PRIORITY.reminder,
    urgent: false,
    title,
    facts,
    profiles: involved.map(p => p.profile),
    actionFor: p => adviceFor(hazards, p, severe),
    eventKeys: relevant.map(ev => ev.key),
  };
};

export const composeTodayReminder = (
  events: readonly AlertEvent[],
  places: Record<string, AlertPlace>,
  nowMs: number,
): AlertMessage | null => {
  const part = composeTodayReminderPart(events, places, nowMs);
  return part ? toMessage(part, `reminder:${nowMs}`) : null;
};

// Live news first, then today, then what's coming, then the rest.
const DIGEST_ORDER = ['live', 'reminder', 'preview', 'cancelled', 'cleared'];

// One push for a digest slot: the due notices plus, in the morning, the
// reminder about today. Several parts become one message — one line of
// facts each, then the most important part's action once, voiced for
// every place the digest covers — titled by the most important part. The
// daily cap counts pushes, and the design doc's typical episode is two or
// three of them.
export const composeDigest = (params: {
  slot: DigestSlot;
  due: readonly AlertEvent[];
  events: readonly AlertEvent[];
  places: Record<string, AlertPlace>;
  nowMs: number;
  noEventDays: NoEventDays;
}): AlertMessage | null => {
  const { slot, due, events, places, nowMs, noEventDays } = params;
  const dueKeys = new Set(due.map(ev => ev.key));
  const parts = composeParts(due, places, nowMs);
  if (slot === 'morning') {
    const reminder = composeTodayReminderPart(
      events.filter(ev => !dueKeys.has(ev.key)),
      places,
      nowMs,
    );
    if (reminder) parts.push(reminder);
  }
  const id = `digest:${slot}:${nowMs}`;

  if (parts.length === 0) {
    return slot === 'morning' && noEventDays === 'summary'
      ? {
          id,
          group: 'summary',
          priority: ALERT_MESSAGE_PRIORITY.summary,
          urgent: false,
          title: REMINDER_COPY.noEventsTitle,
          body: REMINDER_COPY.noEventsBody,
          eventKeys: [],
        }
      : null;
  }

  const ordered = [...parts].sort(
    (a, b) => DIGEST_ORDER.indexOf(a.group) - DIGEST_ORDER.indexOf(b.group),
  );
  if (ordered.length === 1) return toMessage(ordered[0], id);
  const action = ordered[0].actionFor(adviceProfileFor(ordered.flatMap(m => m.profiles)));
  return {
    id,
    group: 'digest',
    priority: Math.min(...ordered.map(m => m.priority)),
    urgent: ordered.some(m => m.urgent),
    title: ordered[0].title,
    body: [...ordered.map(m => m.facts), action].join('\n'),
    eventKeys: Array.from(new Set(ordered.flatMap(m => m.eventKeys))),
  };
};

// ---- Records for the detail sheet -----------------------------------------

export const buildMessageRecord = (
  message: AlertMessage,
  eventsByKey: ReadonlyMap<string, AlertEvent>,
  places: Record<string, AlertPlace>,
  sentAtMs: number,
): AlertMessageRecord => ({
  id: message.id,
  title: message.title,
  body: message.body,
  sentAtMs,
  urgent: message.urgent,
  items: message.eventKeys.flatMap(key => {
    const ev = eventsByKey.get(key);
    const place = ev ? places[ev.placeId] : undefined;
    if (!ev || !place) return [];
    return [
      {
        eventKey: key,
        placeId: place.id,
        placeLabel: place.label,
        latitude: place.coords?.latitude ?? null,
        longitude: place.coords?.longitude ?? null,
        hazard: ev.hazard,
        stage: ev.stage,
        value: ev.latestValue,
        rank: ev.pending?.rank ?? ev.toldRank,
        forecast: ev.forecast,
        ...personOf(place.profile),
        caringFor: place.profile.caringFor,
      },
    ];
  }),
});
