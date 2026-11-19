import { homeAdviceFor } from '../homeAdvice';
import { DEFAULT_PLACE_ALERT_PROFILE } from '../../config/alertConfig';
import {
  AQHI_ADVICE,
  DUAL_ADVICE,
  HEAT_ADVICE,
  HEAT_URGENT_ADVICE,
} from '../../config/alertCopy';
import { PlaceAlertProfile } from '../../types/alerts';

const general = DEFAULT_PLACE_ALERT_PROFILE;
const sensitive: PlaceAlertProfile = { ...general, identities: ['older'] };
const family: PlaceAlertProfile = { ...general, caringFor: 'family' };

// The personalised sentence that leads the Environmental Index detail sheet
// while an alert is live. The card itself never changes for an alert.
describe('homeAdviceFor', () => {
  it('uses the alert’s own advice, voiced for About you, while an alert is live', () => {
    expect(
      homeAdviceFor({ liveAlerts: [{ hazard: 'heat', urgent: false }], aboutYou: sensitive }),
    ).toBe(HEAT_ADVICE.sensitive.self);
    expect(
      homeAdviceFor({ liveAlerts: [{ hazard: 'aqhi', urgent: false }], aboutYou: general }),
    ).toBe(AQHI_ADVICE.general.self);
  });

  it('uses the family voice when About you is for someone else', () => {
    expect(
      homeAdviceFor({ liveAlerts: [{ hazard: 'heat', urgent: false }], aboutYou: family }),
    ).toBe(HEAT_ADVICE.general.family);
  });

  it('uses the urgent advice for an urgent alert', () => {
    expect(
      homeAdviceFor({ liveAlerts: [{ hazard: 'heat', urgent: true }], aboutYou: general }),
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
      }),
    ).toBe(DUAL_ADVICE.self);
  });

  it('is null without a live alert — the sheet then gives only the level’s actions', () => {
    expect(homeAdviceFor({ liveAlerts: [], aboutYou: general })).toBeNull();
  });
});
