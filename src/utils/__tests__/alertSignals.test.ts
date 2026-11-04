import { buildHazardSignal, findForecastWindow, HourlyValue } from '../alertSignals';
import { DEFAULT_PLACE_ALERT_PROFILE } from '../../config/alertConfig';

const HOUR = 60 * 60 * 1000;
const T0 = Date.UTC(2026, 10, 4, 6); // 2 pm HKT

const hourly = (values: number[], fromMs = T0 - HOUR): HourlyValue[] =>
  values.map((value, i) => ({ timestampMs: fromMs + i * HOUR, value }));

describe('findForecastWindow', () => {
  // AQHI High = rank 2
  it('finds the first run of hours at or above the level', () => {
    // one past hour (ignored), then 4, 7, 9, 8, 5, 7
    const w = findForecastWindow('aqhi', hourly([10, 4, 7, 9, 8, 5, 7]), 2, T0);
    expect(w).toEqual({
      startMs: T0 + HOUR,
      endMs: T0 + 4 * HOUR,
      minValue: 7,
      maxValue: 9,
      peakRank: 3,
    });
  });

  it('ignores breaches beyond the preview horizon', () => {
    const far = hourly([8], T0 + 40 * HOUR);
    expect(findForecastWindow('aqhi', far, 2, T0)).toBeNull();
  });

  it('returns null when nothing reaches the level', () => {
    expect(findForecastWindow('aqhi', hourly([3, 4, 6, 5]), 2, T0)).toBeNull();
  });
});

describe('buildHazardSignal', () => {
  const base = {
    placeId: 'home',
    hazard: 'aqhi' as const,
    profile: DEFAULT_PLACE_ALERT_PROFILE,
    allClear: 'auto' as const,
    nowMs: T0,
  };

  it('uses the audience level, or the Advanced override when set', () => {
    const general = buildHazardSignal({ ...base, reading: { current: 7, forecast: null } });
    expect(general.thresholdRank).toBe(3); // Very High
    const overridden = buildHazardSignal({
      ...base,
      profile: { ...DEFAULT_PLACE_ALERT_PROFILE, levelOverride: { aqhi: 'High' } },
      reading: { current: 7, forecast: null },
    });
    expect(overridden.thresholdRank).toBe(2);
  });

  it('reports a missing forecast as unavailable, not as no breach', () => {
    const s = buildHazardSignal({ ...base, reading: { current: null, forecast: null } });
    expect(s.forecastAvailable).toBe(false);
    expect(s.currentRank).toBeNull();
  });

  it('wants an all clear on auto only for family places', () => {
    const self = buildHazardSignal({ ...base, reading: { current: 3, forecast: [] } });
    const family = buildHazardSignal({
      ...base,
      profile: { ...DEFAULT_PLACE_ALERT_PROFILE, caringFor: 'family' },
      reading: { current: 3, forecast: [] },
    });
    expect(self.allClearWanted).toBe(false);
    expect(family.allClearWanted).toBe(true);
  });

  it('flags a breach starting within the clear lookahead', () => {
    const s = buildHazardSignal({
      ...base,
      reading: { current: 5, forecast: hourly([5, 5, 9]) },
    });
    expect(s.forecastBreachSoon).toBe(true);
  });
});
