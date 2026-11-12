// src/hooks/useAlertMessageLog.ts
import { useEffect, useState } from 'react';
import { AlertMessageRecord } from '../types/alerts';
import { ACTIVE_ALERTS_REFRESH_MS, ALERT_MESSAGE_LOG_CONFIG } from '../config/alertConfig';
import { ALERT_UI } from '../config/alertUiConfig';
import { readMessageLog } from '../services/alertStateStorage';
import { onAlertCheckDone } from '../services/alertCheckBus';

// Newest first, at most `max`. The log is trimmed by age only when a new
// message is written, so a quiet spell can leave stale entries in storage —
// they are dropped here too, so the list never claims more than the
// retention window it says it covers.
export const selectRecentMessages = (
  records: readonly AlertMessageRecord[],
  max: number,
  nowMs: number,
): AlertMessageRecord[] =>
  records
    .filter(record => nowMs - record.sentAtMs < ALERT_MESSAGE_LOG_CONFIG.retentionMs)
    .sort((a, b) => b.sentAtMs - a.sentAtMs)
    .slice(0, max);

// The messages already delivered, for the Alerts tab's "Recent alerts" —
// so an alert swiped away from the notification shade can still be found.
// Refreshes the same way as useActiveAlerts: after every check and on a
// short timer, since checks also run in the background.
export const useAlertMessageLog = () => {
  const [messages, setMessages] = useState<AlertMessageRecord[]>([]);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      const records = await readMessageLog();
      if (isMounted) setMessages(selectRecentMessages(records, ALERT_UI.recentAlertsMax, Date.now()));
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

  return messages;
};
