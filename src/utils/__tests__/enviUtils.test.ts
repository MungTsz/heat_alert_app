import {
  dominantHazard,
  getEnviLevel,
  getEnviLevelInfo,
  hazardLevelOf,
  leadHazard,
  seasonalHazard,
} from '../enviUtils';
import { ENVI_LEVELS } from '../../config/enviConfig';
import { HAZARD_KINDS } from '../../config/alertConfig';
import { HAZARD_LEVELS } from '../hazardLevels';

// Heat index (°C): <27 No Caution, 27-32 Caution, 32-39 Extreme Caution,
// 39-52 Danger, 52+ Extreme Danger. AQHI: 1-3 Low, 4-6 Moderate, 7 High,
// 8-10 Very High, 10+ Serious.

// Noon HKT on the given month's 15th.
const hkNoon = (month: number) => Date.UTC(2026, month - 1, 15, 4);

describe('ENVI_LEVELS', () => {
  it('has one level for each of the two hazards’ own levels', () => {
    HAZARD_KINDS.forEach(hazard => {
      expect(HAZARD_LEVELS[hazard]).toHaveLength(ENVI_LEVELS.length);
    });
    expect(ENVI_LEVELS.map(l => l.level)).toEqual([1, 2, 3, 4, 5]);
  });
});

describe('hazardLevelOf', () => {
  it('numbers each hazard’s own levels 1 to 5', () => {
    expect([25, 30, 35, 45, 55].map(v => hazardLevelOf('heat', v))).toEqual([1, 2, 3, 4, 5]);
    expect([2, 5, 7, 9, 11].map(v => hazardLevelOf('aqhi', v))).toEqual([1, 2, 3, 4, 5]);
  });

  it('is null without a reading', () => {
    expect(hazardLevelOf('heat', null)).toBeNull();
    expect(hazardLevelOf('aqhi', NaN)).toBeNull();
  });
});

describe('getEnviLevel', () => {
  it('is the higher of the two levels', () => {
    expect(getEnviLevel({ heat: 45, aqhi: 2 })).toBe(4);
    expect(getEnviLevel({ heat: 25, aqhi: 11 })).toBe(5);
    expect(getEnviLevel({ heat: 25, aqhi: 2 })).toBe(1);
  });

  it('is the shared level on a tie', () => {
    expect(getEnviLevel({ heat: 35, aqhi: 7 })).toBe(3);
  });

  it('uses the one reading there is', () => {
    expect(getEnviLevel({ heat: 35, aqhi: null })).toBe(3);
    expect(getEnviLevel({ heat: null, aqhi: 5 })).toBe(2);
  });

  it('is null when neither reading is available', () => {
    expect(getEnviLevel({ heat: null, aqhi: null })).toBeNull();
  });
});

describe('dominantHazard', () => {
  it('is the hazard with the higher level', () => {
    expect(dominantHazard({ heat: 45, aqhi: 2 })).toBe('heat');
    expect(dominantHazard({ heat: 25, aqhi: 9 })).toBe('aqhi');
  });

  it('is null on a tie', () => {
    expect(dominantHazard({ heat: 35, aqhi: 7 })).toBeNull();
    expect(dominantHazard({ heat: 25, aqhi: 2 })).toBeNull();
  });

  it('never lets a missing reading win over an available one', () => {
    expect(dominantHazard({ heat: 25, aqhi: null })).toBe('heat');
    expect(dominantHazard({ heat: null, aqhi: 2 })).toBe('aqhi');
  });

  it('is null when both are missing', () => {
    expect(dominantHazard({ heat: null, aqhi: null })).toBeNull();
  });
});

describe('getEnviLevelInfo', () => {
  it('returns the level’s name and colours', () => {
    expect(getEnviLevelInfo(1)).toBe(ENVI_LEVELS[0]);
    expect(getEnviLevelInfo(5).name).toBe('Serious');
  });
});

describe('seasonalHazard', () => {
  it('is AQHI December to May and heat June to November', () => {
    expect([12, 1, 5].map(m => seasonalHazard(hkNoon(m)))).toEqual(['aqhi', 'aqhi', 'aqhi']);
    expect([6, 8, 11].map(m => seasonalHazard(hkNoon(m)))).toEqual(['heat', 'heat', 'heat']);
  });

  it('reads the month on the Hong Kong calendar', () => {
    // 31 May 20:00 UTC is already 1 June in Hong Kong.
    expect(seasonalHazard(Date.UTC(2026, 4, 31, 20))).toBe('heat');
  });
});

describe('leadHazard', () => {
  it('is the higher hazard whatever the season', () => {
    expect(leadHazard({ heat: 45, aqhi: 2 }, hkNoon(1))).toBe('heat');
    expect(leadHazard({ heat: 25, aqhi: 9 }, hkNoon(8))).toBe('aqhi');
  });

  it('falls back to the season on a tie or with no readings', () => {
    expect(leadHazard({ heat: 30, aqhi: 5 }, hkNoon(8))).toBe('heat');
    expect(leadHazard({ heat: 30, aqhi: 5 }, hkNoon(1))).toBe('aqhi');
    expect(leadHazard({ heat: null, aqhi: null }, hkNoon(1))).toBe('aqhi');
  });
});
