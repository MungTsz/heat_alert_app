import { pickForecastHazard } from '../forecastHazard';

// Noon HKT on the given month's 15th.
const hkNoon = (month: number) => Date.UTC(2026, month - 1, 15, 4);
const SUMMER = hkNoon(8);
const WINTER = hkNoon(1);

// Heat index (°C): 25 No Caution, 30 Caution, 35 Extreme Caution, 45 Danger.
// AQHI: 2 Low, 5 Moderate, 7 High, 9 Very High.
const pick = (
  current: { heat: number | null; aqhi: number | null },
  nowMs: number,
  praiseConfigured = true,
) => pickForecastHazard({ current, praiseConfigured, nowMs });

describe('pickForecastHazard', () => {
  it('opens on the hazard with the higher level, whatever the season', () => {
    expect(pick({ heat: 30, aqhi: 9 }, SUMMER)).toBe('aqhi');
    expect(pick({ heat: 45, aqhi: 5 }, WINTER)).toBe('heat');
    // One level apart is enough — no alert level has to be reached.
    expect(pick({ heat: 30, aqhi: 2 }, WINTER)).toBe('heat');
    expect(pick({ heat: 25, aqhi: 5 }, SUMMER)).toBe('aqhi');
  });

  it('falls back to the season on a tie — AQHI December to May, heat June to November', () => {
    // Both at the lowest level
    expect(pick({ heat: 25, aqhi: 2 }, hkNoon(12))).toBe('aqhi');
    expect(pick({ heat: 25, aqhi: 2 }, hkNoon(5))).toBe('aqhi');
    expect(pick({ heat: 25, aqhi: 2 }, hkNoon(6))).toBe('heat');
    expect(pick({ heat: 25, aqhi: 2 }, hkNoon(11))).toBe('heat');
    // Both at the same higher level
    expect(pick({ heat: 35, aqhi: 7 }, WINTER)).toBe('aqhi');
    expect(pick({ heat: 35, aqhi: 7 }, SUMMER)).toBe('heat');
  });

  it('falls back to the season while both readings are missing', () => {
    expect(pick({ heat: null, aqhi: null }, WINTER)).toBe('aqhi');
    expect(pick({ heat: null, aqhi: null }, SUMMER)).toBe('heat');
  });

  it('never lets a missing reading win over an available one', () => {
    expect(pick({ heat: 25, aqhi: null }, WINTER)).toBe('heat');
    expect(pick({ heat: null, aqhi: 2 }, SUMMER)).toBe('aqhi');
  });

  it('reads the month on the Hong Kong calendar', () => {
    // 31 May 20:00 UTC is already 1 June in Hong Kong.
    expect(pick({ heat: null, aqhi: null }, Date.UTC(2026, 4, 31, 20))).toBe('heat');
  });

  it('always opens on heat when PRAISE is not configured, since AQHI has nothing to show', () => {
    expect(pick({ heat: 25, aqhi: 10 }, WINTER, false)).toBe('heat');
  });
});
