// src/hooks/useActiveAlerts.ts
import { useEffect, useState } from 'react';
import { AlertEvent, AlertMessageRecord, HazardKind } from '../types/alerts';
import { ACTIVE_ALERTS_REFRESH_MS } from '../config/alertConfig';
import { ACTIVE_ALERT_BADGE_COPY } from '../config/alertCopy';
import { readAlertEvents, readMessageLog } from '../services/alertStateStorage';
import { onAlertCheckDone } from '../services/alertCheckBus';
import { describeStart } from '../utils/alertMessages';

export type ActiveAlertBadge = {
  hazard: HazardKind;
  kind: 'now' | 'headsUp';
  text: string;
  // The latest message about this event — what tapping the badge opens.
  // null if that message has aged out of the log.
  messageId: string | null;
};

// Only what the user has actually been told: a badge must never announce
// an alert the notifications haven't (e.g. one still in its batching wait
// or held by quiet hours).
const toBadge = (
  ev: AlertEvent,
  latestMessageByEvent: Map<string, string>,
  nowMs: number,
): ActiveAlertBadge | null => {
  if (ev.toldRank < 0) return null;
  const messageId = latestMessageByEvent.get(ev.key) ?? null;
  if (ev.stage === 'active') {
    return { hazard: ev.hazard, kind: 'now', text: ACTIVE_ALERT_BADGE_COPY.now, messageId };
  }
  if (ev.stage === 'forecast' && ev.forecast) {
    return {
      hazard: ev.hazard,
      kind: 'headsUp',
      text: ACTIVE_ALERT_BADGE_COPY.headsUp(describeStart(ev.forecast.startMs, nowMs)),
      messageId,
    };
  }
  return null;
};

const latestMessageIds = (records: readonly AlertMessageRecord[]): Map<string, string> => {
  const map = new Map<string, string>();
  // Records are newest first, so the first one seen per event wins.
  for (const record of records) {
    for (const item of record.items) {
      if (!map.has(item.eventKey)) map.set(item.eventKey, record.id);
    }
  }
  return map;
};

// Told, still-relevant alerts keyed by place id (bookmark id, or the
// current-location id) — for Home's hazard cards and Community's place
// cards. Re-read after every check and on a short timer, since checks also
// run in the background.
export const useActiveAlerts = () => {
  const [badgesByPlace, setBadgesByPlace] = useState<Record<string, ActiveAlertBadge[]>>({});

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      const [events, records] = await Promise.all([readAlertEvents(), readMessageLog()]);
      if (!isMounted) return;
      const latest = latestMessageIds(records);
      const nowMs = Date.now();
      const next: Record<string, ActiveAlertBadge[]> = {};
      for (const ev of events) {
        const badge = toBadge(ev, latest, nowMs);
        if (badge) (next[ev.placeId] ??= []).push(badge);
      }
      setBadgesByPlace(next);
    };
    load();
    const unsubscribe = onAlertCheckDone(load);
    const interval = setInterval(load, ACTIVE_ALERTS_REFRESH_MS);
    return () => {
      isMounted = false;
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  return badgesByPlace;
};
