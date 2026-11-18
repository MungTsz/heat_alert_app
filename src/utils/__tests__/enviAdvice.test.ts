import { enviAdviceFor, hazardSuggestionFor } from '../enviAdvice';
import {
  AQHI_LEVEL_SUGGESTION,
  AQHI_URGENT_ADVICE,
  DUAL_ADVICE,
  HEAT_LEVEL_SUGGESTION,
  HEAT_URGENT_ADVICE,
} from '../../config/alertCopy';
import { HOME_LAYOUT_CONFIG } from '../../config/homeLayoutConfig';
import { HAZARD_LEVELS } from '../hazardLevels';

// Heat index (°C): 25 No Caution, 30 Caution, 35 Extreme Caution, 45 Danger,
// 55 Extreme Danger. AQHI: 2 Low, 5 Moderate, 7 High, 9 Very High, 11 Serious.

// Noon HKT on the given month's 15th.
const hkNoon = (month: number) => Date.UTC(2026, month - 1, 15, 4);
const SUMMER = hkNoon(8);
const WINTER = hkNoon(1);

describe('enviAdviceFor', () => {
  it('gives the combined advice when both hazards reach level 3', () => {
    expect(enviAdviceFor({ heat: 35, aqhi: 7 }, SUMMER)).toBe(DUAL_ADVICE.self);
    expect(enviAdviceFor({ heat: 55, aqhi: 9 }, WINTER)).toBe(DUAL_ADVICE.self);
  });

  it('does not combine when only one hazard reaches level 3', () => {
    expect(enviAdviceFor({ heat: 45, aqhi: 5 }, SUMMER)).toBe(HEAT_LEVEL_SUGGESTION.Danger);
    expect(enviAdviceFor({ heat: 45, aqhi: null }, SUMMER)).toBe(HEAT_LEVEL_SUGGESTION.Danger);
  });

  it('gives the higher hazard’s suggestion for its own level', () => {
    expect(enviAdviceFor({ heat: 30, aqhi: 2 }, WINTER)).toBe(HEAT_LEVEL_SUGGESTION.Caution);
    expect(enviAdviceFor({ heat: 25, aqhi: 9 }, SUMMER)).toBe(AQHI_LEVEL_SUGGESTION['Very High']);
    expect(enviAdviceFor({ heat: null, aqhi: 5 }, SUMMER)).toBe(AQHI_LEVEL_SUGGESTION.Moderate);
  });

  it('reuses the urgent advice at the top level', () => {
    expect(enviAdviceFor({ heat: 55, aqhi: 2 }, SUMMER)).toBe(HEAT_URGENT_ADVICE.self);
    expect(enviAdviceFor({ heat: 25, aqhi: 11 }, SUMMER)).toBe(AQHI_URGENT_ADVICE.self);
  });

  it('breaks a tie by season — heat June to November, AQHI December to May', () => {
    expect(enviAdviceFor({ heat: 30, aqhi: 5 }, SUMMER)).toBe(HEAT_LEVEL_SUGGESTION.Caution);
    expect(enviAdviceFor({ heat: 30, aqhi: 5 }, WINTER)).toBe(AQHI_LEVEL_SUGGESTION.Moderate);
  });

  it('says nothing at level 1 or with no readings', () => {
    expect(enviAdviceFor({ heat: 25, aqhi: 2 }, SUMMER)).toBeNull();
    expect(enviAdviceFor({ heat: 25, aqhi: null }, SUMMER)).toBeNull();
    expect(enviAdviceFor({ heat: null, aqhi: null }, SUMMER)).toBeNull();
  });
});

describe('hazardSuggestionFor', () => {
  it('is null for the lowest level and for a missing reading', () => {
    expect(hazardSuggestionFor('heat', 25)).toBeNull();
    expect(hazardSuggestionFor('aqhi', 2)).toBeNull();
    expect(hazardSuggestionFor('heat', null)).toBeNull();
  });
});

describe('level suggestions', () => {
  it('cover every level above the lowest, and only those', () => {
    expect(Object.keys(HEAT_LEVEL_SUGGESTION)).toEqual(HAZARD_LEVELS.heat.slice(1));
    expect(Object.keys(AQHI_LEVEL_SUGGESTION)).toEqual(HAZARD_LEVELS.aqhi.slice(1));
  });

  const sentences = [
    ...Object.values(HEAT_LEVEL_SUGGESTION),
    ...Object.values(AQHI_LEVEL_SUGGESTION),
    DUAL_ADVICE.self,
  ];

  it.each(sentences)('"%s" fits the ENVI card', sentence => {
    expect(sentence.length).toBeLessThanOrEqual(HOME_LAYOUT_CONFIG.adviceMaxChars);
  });
});
