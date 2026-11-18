// src/utils/homeAdvice.ts
import { HazardKind } from '../types/alerts';
import { adviceFor, adviceProfileFor } from './alertMessages';
import { enviAdviceFor } from './enviAdvice';
import { HazardReadings } from './enviUtils';

type LiveAlert = { hazard: HazardKind; urgent: boolean };
type AdviceProfile = Parameters<typeof adviceFor>[1];

// The one sentence on Home's ENVI card — the only place Home gives advice.
// With an alert measured NOW at your location it is that alert's own advice,
// voiced for the About you answer and built by the same adviceFor the
// notification and the detail sheet use, so the three never word it
// differently. Otherwise it is the suggestion for the current ENVI level
// (null at level 1 or with no readings → the line is left out).
export const homeAdviceFor = (params: {
  liveAlerts: readonly LiveAlert[];
  aboutYou: AdviceProfile;
  current: HazardReadings;
  nowMs?: number;
}): string | null => {
  const { liveAlerts, aboutYou, current, nowMs } = params;
  if (liveAlerts.length > 0) {
    return adviceFor(
      liveAlerts.map(alert => alert.hazard),
      adviceProfileFor([aboutYou]),
      liveAlerts.some(alert => alert.urgent),
    );
  }
  return enviAdviceFor(current, nowMs);
};
