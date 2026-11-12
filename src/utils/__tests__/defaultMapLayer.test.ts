import { pickDefaultMapLayer } from '../defaultMapLayer';
import { DEFAULT_PLACE_ALERT_PROFILE } from '../../config/alertConfig';
import { PlaceAlertProfile } from '../../types/alerts';

// Noon HKT on the given month's 15th.
const hkNoon = (month: number) => Date.UTC(2026, month - 1, 15, 4);
const SUMMER = hkNoon(8);
const WINTER = hkNoon(1);

// General adult: alerts at heat index Danger (41°C+) and AQHI Very High (8+).
const general = DEFAULT_PLACE_ALERT_PROFILE;

const pick = (
  current: { heat: number | null; aqhi: number | null },
  nowMs: number,
  profile: PlaceAlertProfile = general,
  praiseConfigured = true,
) => pickDefaultMapLayer({ current, profile, praiseConfigured, nowMs });

describe('pickDefaultMapLayer', () => {
  it('opens on the hazard that has reached the alert level, whatever the season', () => {
    expect(pick({ heat: 30, aqhi: 9 }, SUMMER)).toBe('aqhi');
    expect(pick({ heat: 42, aqhi: 3 }, WINTER)).toBe('heat');
  });

  it("judges 'reached' at the profile's own level", () => {
    // Extreme Caution (32-39°C) reaches an older adult's level, not a general adult's.
    const sensitive: PlaceAlertProfile = { ...general, audience: 'sensitive' };
    expect(pick({ heat: 35, aqhi: 3 }, WINTER, general)).toBe('aqhi');
    expect(pick({ heat: 35, aqhi: 3 }, WINTER, sensitive)).toBe('heat');
  });

  it('ignores a hazard the profile switched off', () => {
    const heatOff: PlaceAlertProfile = { ...general, hazards: { heat: false, aqhi: true } };
    expect(pick({ heat: 45, aqhi: 3 }, WINTER, heatOff)).toBe('aqhi');
  });

  it('falls back to the season on a tie — AQHI December to May, heat June to November', () => {
    // Neither reached
    expect(pick({ heat: 25, aqhi: 3 }, hkNoon(12))).toBe('aqhi');
    expect(pick({ heat: 25, aqhi: 3 }, hkNoon(5))).toBe('aqhi');
    expect(pick({ heat: 25, aqhi: 3 }, hkNoon(6))).toBe('heat');
    expect(pick({ heat: 25, aqhi: 3 }, hkNoon(11))).toBe('heat');
    // Both reached
    expect(pick({ heat: 45, aqhi: 10 }, WINTER)).toBe('aqhi');
    expect(pick({ heat: 45, aqhi: 10 }, SUMMER)).toBe('heat');
    // Still loading counts as not reached
    expect(pick({ heat: null, aqhi: null }, WINTER)).toBe('aqhi');
  });

  it('reads the month on the Hong Kong calendar', () => {
    // 31 May 20:00 UTC is already 1 June in Hong Kong.
    expect(pick({ heat: null, aqhi: null }, Date.UTC(2026, 4, 31, 20))).toBe('heat');
  });

  it('always opens on heat when PRAISE is not configured, so mock AQHI never leads', () => {
    expect(pick({ heat: 25, aqhi: 10 }, WINTER, general, false)).toBe('heat');
  });
});
