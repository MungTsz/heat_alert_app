import { adviceFor } from '../alertMessages';
import { homeAdviceFor } from '../homeAdvice';
import {
  AUDIENCE_GROUPS,
  DEFAULT_PLACE_ALERT_PROFILE,
  HAZARD_KINDS,
} from '../../config/alertConfig';
import {
  AQHI_ADVICE,
  DUAL_ADVICE,
  HEAT_ADVICE,
  HEAT_LEVEL_SUGGESTION,
  HEAT_URGENT_ADVICE,
} from '../../config/alertCopy';
import { HOME_LAYOUT_CONFIG } from '../../config/homeLayoutConfig';
import { CaringFor, HazardKind, PlaceAlertProfile } from '../../types/alerts';

// Noon HKT, 15 August 2026.
const SUMMER = Date.UTC(2026, 7, 15, 4);

const general = DEFAULT_PLACE_ALERT_PROFILE;
const sensitive: PlaceAlertProfile = { ...general, audience: 'sensitive' };

// Home gives advice in one place: the sentence on the ENVI card.
describe('homeAdviceFor', () => {
  it('uses the alert’s own advice, voiced for About you, while an alert is live', () => {
    expect(
      homeAdviceFor({
        liveAlerts: [{ hazard: 'heat', urgent: false }],
        aboutYou: sensitive,
        current: { heat: 35, aqhi: 2 },
        nowMs: SUMMER,
      }),
    ).toBe(HEAT_ADVICE.sensitive.self);
    expect(
      homeAdviceFor({
        liveAlerts: [{ hazard: 'aqhi', urgent: false }],
        aboutYou: general,
        current: { heat: 25, aqhi: 9 },
        nowMs: SUMMER,
      }),
    ).toBe(AQHI_ADVICE.general.self);
  });

  it('uses the urgent advice for an urgent alert', () => {
    expect(
      homeAdviceFor({
        liveAlerts: [{ hazard: 'heat', urgent: true }],
        aboutYou: general,
        current: { heat: 55, aqhi: 2 },
        nowMs: SUMMER,
      }),
    ).toBe(HEAT_URGENT_ADVICE.self);
  });

  it('uses the combined advice when both hazards have a live alert', () => {
    expect(
      homeAdviceFor({
        liveAlerts: [
          { hazard: 'heat', urgent: false },
          { hazard: 'aqhi', urgent: false },
        ],
        aboutYou: general,
        current: { heat: 45, aqhi: 9 },
        nowMs: SUMMER,
      }),
    ).toBe(DUAL_ADVICE.self);
  });

  it('falls back to the ENVI level’s suggestion without an alert', () => {
    expect(
      homeAdviceFor({
        liveAlerts: [],
        aboutYou: sensitive,
        current: { heat: 30, aqhi: 2 },
        nowMs: SUMMER,
      }),
    ).toBe(HEAT_LEVEL_SUGGESTION.Caution);
  });

  it('says nothing at ENVI level 1 without an alert', () => {
    expect(
      homeAdviceFor({
        liveAlerts: [],
        aboutYou: general,
        current: { heat: 25, aqhi: 2 },
        nowMs: SUMMER,
      }),
    ).toBeNull();
  });
});

// Every variant adviceFor can produce must stay a short line on the ENVI
// card, the way pushBodyMaxChars holds the push bodies. (The level
// suggestions are held to the same length in enviAdvice.test.ts.)
describe('alert advice on the ENVI card', () => {
  const hazardSets: HazardKind[][] = [...HAZARD_KINDS.map(h => [h]), [...HAZARD_KINDS]];
  const voices: CaringFor[] = ['self', 'family'];
  const variants = hazardSets.flatMap(hazards =>
    AUDIENCE_GROUPS.flatMap(audience =>
      voices.flatMap(caringFor =>
        [false, true].map(severe => adviceFor(hazards, { audience, caringFor }, severe)),
      ),
    ),
  );

  it.each(variants)('"%s" fits the card', advice => {
    expect(advice.length).toBeLessThanOrEqual(HOME_LAYOUT_CONFIG.adviceMaxChars);
  });
});
