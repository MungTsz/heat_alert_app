// src/utils/homeAdvice.ts
import { HazardKind } from '../types/alerts';
import { AdviceSource, adviceFor, adviceProfileFor } from './alertMessages';

type LiveAlert = { hazard: HazardKind; urgent: boolean };

// The personalised sentence that leads the Environmental Index detail
// sheet's advice while an alert is measured NOW at your location: that
// alert's own advice, voiced for the About you answer and built by the same
// adviceFor the notification and the alert detail sheet use, so the three
// never word it differently. null without a live alert — the sheet then
// gives only the level's action sentences, and the card itself is the same
// either way.
export const homeAdviceFor = (params: {
  liveAlerts: readonly LiveAlert[];
  aboutYou: AdviceSource;
}): string | null => {
  const { liveAlerts, aboutYou } = params;
  if (liveAlerts.length === 0) return null;
  return adviceFor(
    liveAlerts.map(alert => alert.hazard),
    adviceProfileFor([aboutYou]),
    liveAlerts.some(alert => alert.urgent),
  );
};
