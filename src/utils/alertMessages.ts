// src/utils/alertMessages.ts
import {
  AlertEvent,
  AlertMessage,
  AlertMessageGroup,
  HazardKind,
  PlaceAlertProfile,
} from '../types/alerts';
import {
  ALERT_DELIVERY_CONFIG,
  ALERT_MESSAGE_PRIORITY,
  HAZARD_KINDS,
  SAMPLE_PREVIEW_HK_HOUR,
} from '../config/alertConfig';
import {
  AQHI_ADVICE,
  AQHI_URGENT_ADVICE,
  DUAL_ADVICE,
  HEAT_ADVICE,
  MESSAGE_COPY,
  PLACE_LIST_COPY,
  TIME_COPY,
} from '../config/alertCopy';
import { addHkDays, diffHkDays, parseHkTimestamp, toHkDateKey, toHkTimestamp } from './hkDate';
import { formatHazardValue, levelAtRank, levelOf } from './hazardLevels';
import { noticeGroupOf } from './alertEvents';
import { urgentRankFor } from './alertProfile';

// Turns due notices into push notifications. Structure from Sutton's
// complete-warning elements, trimmed for a lock screen: what and how bad
// (title), where and when, then one concrete action. Every word comes from
// alertCopy.ts.

export type AlertPlace = {
  id: string;
  label: string;
  profile: PlaceAlertProfile;
};

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

const formatHkClock = (ms: number): string => {
  const hour = Number(toHkTimestamp(new Date(ms)).slice(8, 10));
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${hour12} ${hour < 12 ? TIME_COPY.am : TIME_COPY.pm}`;
};

// "from about 2 pm tomorrow". Hour precision only — forecast data is
// hourly, and "about" keeps it honest.
export const describeStart = (startMs: number, nowMs: number): string => {
  const dayKey = toHkDateKey(new Date(startMs));
  const dayDiff = diffHkDays(toHkDateKey(new Date(nowMs)), dayKey);
  const day =
    dayDiff <= 0
      ? TIME_COPY.today
      : dayDiff === 1
        ? TIME_COPY.tomorrow
        : TIME_COPY.onWeekday(TIME_COPY.weekdays[new Date(`${dayKey}T00:00:00Z`).getUTCDay()]);
  return TIME_COPY.from(formatHkClock(startMs), day);
};

const adviceFor = (
  hazards: readonly HazardKind[],
  profile: PlaceAlertProfile,
  severe: boolean,
): string => {
  const voice = profile.caringFor;
  if (hazards.length > 1) return DUAL_ADVICE[voice];
  if (hazards[0] === 'aqhi') {
    return severe ? AQHI_URGENT_ADVICE[voice] : AQHI_ADVICE[profile.audience][voice];
  }
  return HEAT_ADVICE[profile.audience][voice];
};

// Worst first, so the title, the advice and the first-named place all come
// from the place that needs the most attention.
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

const composeGroup = (
  group: AlertMessageGroup,
  events: AlertEvent[],
  places: Record<string, AlertPlace>,
  nowMs: number,
): AlertMessage | null => {
  const sorted = [...events].sort(byConcern);
  const lead = sorted[0];
  const leadPlace = places[lead.placeId];
  if (!leadPlace) return null;

  const hazards = HAZARD_KINDS.filter(h => sorted.some(ev => ev.hazard === h));
  const placeText = formatPlaceList(
    sorted.map(ev => places[ev.placeId]?.label).filter((l): l is string => !!l),
  );
  const firstOf = (h: HazardKind) => sorted.find(ev => ev.hazard === h)!;
  const severe = lead.pending!.rank >= urgentRankFor(lead.hazard);
  const advice = adviceFor(hazards, leadPlace.profile, severe);
  const dual = hazards.length > 1;

  let title: string;
  let body: string;
  switch (group) {
    case 'live': {
      if (dual) {
        title = MESSAGE_COPY.dualLiveTitle;
        body = MESSAGE_COPY.dualLiveBody(
          placeText,
          valueOrLevel(firstOf('aqhi')),
          valueOrLevel(firstOf('heat')),
          advice,
        );
      } else {
        const level = valueOrLevel(lead);
        const escalated = sorted.some(ev => ev.pending!.kind === 'escalation');
        title = escalated
          ? MESSAGE_COPY.escalationTitle(lead.hazard, level)
          : MESSAGE_COPY.breakingTitle(lead.hazard, level);
        body = escalated
          ? MESSAGE_COPY.escalationBody(placeText, level, advice)
          : MESSAGE_COPY.breakingBody(placeText, level, advice);
      }
      break;
    }
    case 'preview': {
      const withForecast = sorted.filter(ev => ev.forecast !== null);
      if (withForecast.length === 0) return null;
      const startMs = Math.min(...withForecast.map(ev => ev.forecast!.startMs));
      const when = describeStart(startMs, nowMs);
      // A message made only of updates says so; a fresh heads-up mixed in
      // makes the whole message a plain heads-up.
      const isUpdate = sorted.every(ev => ev.pending!.kind === 'escalation');
      if (dual) {
        title = isUpdate ? MESSAGE_COPY.dualPreviewUpdateTitle : MESSAGE_COPY.dualPreviewTitle;
        body = MESSAGE_COPY.dualPreviewBody(placeText, when, advice);
      } else {
        const windows = withForecast.map(ev => ev.forecast!);
        const min = Math.min(...windows.map(w => w.minValue));
        const max = Math.max(...windows.map(w => w.maxValue));
        const level = levelOf(lead.hazard, max);
        title = isUpdate
          ? MESSAGE_COPY.previewUpdateTitle(lead.hazard, level)
          : MESSAGE_COPY.previewTitle(lead.hazard, level);
        body = MESSAGE_COPY.previewBody(placeText, describeRange(lead.hazard, min, max), when, advice);
      }
      break;
    }
    case 'cancelled':
      title = MESSAGE_COPY.cancelledTitle(hazards);
      body = MESSAGE_COPY.cancelledBody(placeText);
      break;
    case 'cleared':
      title = MESSAGE_COPY.clearedTitle(hazards);
      body = dual
        ? MESSAGE_COPY.dualClearedBody(placeText)
        : MESSAGE_COPY.clearedBody(
            placeText,
            lead.latestValue === null
              ? levelAtRank(lead.hazard, 0)
              : describeValue(lead.hazard, lead.latestValue),
          );
      break;
  }

  return {
    id: `${group}:${nowMs}`,
    group,
    priority: groupPriority(group, sorted),
    urgent: sorted.some(ev => ev.pending!.urgent),
    title,
    body,
    eventKeys: sorted.map(ev => ev.key),
  };
};

const GROUP_ORDER: readonly AlertMessageGroup[] = ['live', 'preview', 'cancelled', 'cleared'];

// One message per group, each merging every place and both hazards — so a
// citywide episode reads as one push, not one per place.
export const composeMessages = (
  due: readonly AlertEvent[],
  places: Record<string, AlertPlace>,
  nowMs: number,
): AlertMessage[] =>
  GROUP_ORDER.flatMap(group => {
    const events = due.filter(ev => noticeGroupOf(ev) === group);
    if (events.length === 0) return [];
    const message = composeGroup(group, events, places, nowMs);
    return message ? [message] : [];
  });

// What a heads-up for this place would look like. Uses the dual-hazard
// template because it has no numbers in it, so the sample can never be
// mistaken for a real reading, and it shows both hazards equally.
export const buildSampleMessage = (place: AlertPlace, nowMs: number): AlertMessage => {
  const tomorrow = addHkDays(toHkDateKey(new Date(nowMs)), 1).replace(/-/g, '');
  const startMs = parseHkTimestamp(`${tomorrow}${String(SAMPLE_PREVIEW_HK_HOUR).padStart(2, '0')}`);
  return {
    id: `sample:${nowMs}`,
    group: 'preview',
    priority: ALERT_MESSAGE_PRIORITY.preview,
    urgent: false,
    title: `${MESSAGE_COPY.samplePrefix}${MESSAGE_COPY.dualPreviewTitle}`,
    body: MESSAGE_COPY.dualPreviewBody(
      place.label,
      describeStart(startMs, nowMs),
      DUAL_ADVICE[place.profile.caringFor],
    ),
    eventKeys: [],
  };
};
