import { enviKeywordsFor } from '../enviKeywords';
import { HAZARD_LEVELS } from '../hazardLevels';
import { HAZARD_KINDS } from '../../config/alertConfig';
import { ENVI_ACTION_COPY, ENVI_WARNING_COPY } from '../../config/alertCopy';
import { ENVI_CONFIG, ENVI_LEVELS } from '../../config/enviConfig';
import {
  ENVI_CALM_ACTIONS,
  ENVI_DUAL_ACTIONS,
  ENVI_HAZARD_ACTIONS,
  ENVI_KEYWORD_LIMITS,
} from '../../config/enviKeywords';
import { ENVI_ACTION_ICONS } from '../../config/enviKeywordIcons';
import { EnviActionId } from '../../types/envi';

// lucide-react-native ships ESM Jest can't parse. Each icon becomes its own
// name, which is all "every keyword has an icon" needs.
jest.mock('lucide-react-native', () =>
  new Proxy({}, { get: (_target, name) => (name === '__esModule' ? true : String(name)) }),
);

// Heat index (°C): 25 No Caution, 30 Caution, 35 Extreme Caution, 45 Danger,
// 55 Extreme Danger. AQHI: 2 Low, 5 Moderate, 7 High, 9 Very High, 11 Serious.

// Noon HKT on the given month's 15th.
const hkNoon = (month: number) => Date.UTC(2026, month - 1, 15, 4);
const SUMMER = hkNoon(8);
const WINTER = hkNoon(1);

describe('enviKeywordsFor', () => {
  it('shows nothing without readings', () => {
    expect(enviKeywordsFor({ heat: null, aqhi: null }, SUMMER)).toEqual({
      warnings: [],
      actions: [],
    });
  });

  it('shows only the calm tile at level 1, with no chip', () => {
    expect(enviKeywordsFor({ heat: 25, aqhi: 2 }, SUMMER)).toEqual({
      warnings: [],
      actions: ['enjoyOutdoors'],
    });
    expect(enviKeywordsFor({ heat: null, aqhi: 2 }, SUMMER).actions).toEqual(['enjoyOutdoors']);
  });

  it('gives the higher hazard’s chip and tiles', () => {
    expect(enviKeywordsFor({ heat: 45, aqhi: 5 }, WINTER)).toEqual({
      warnings: ['Heat stroke possible'],
      actions: ['avoidMidday', 'stayCool', 'drinkWater'],
    });
    expect(enviKeywordsFor({ heat: 30, aqhi: 9 }, SUMMER)).toEqual({
      warnings: ['Risk for everyone'],
      actions: ['lessExertion', 'avoidBusyRoads', 'lessTimeOutside'],
    });
  });

  it('uses the one hazard there is when the other is missing', () => {
    expect(enviKeywordsFor({ heat: 55, aqhi: null }, WINTER)).toEqual({
      warnings: ['Heat stroke likely'],
      actions: ['stayIndoors', 'stayCool', 'drinkWater'],
    });
  });

  it('breaks a tie below level 3 by season — heat June to November, AQHI December to May', () => {
    expect(enviKeywordsFor({ heat: 30, aqhi: 5 }, SUMMER).warnings).toEqual(['Tiredness possible']);
    expect(enviKeywordsFor({ heat: 30, aqhi: 5 }, WINTER).warnings).toEqual(['Mild risk']);
  });

  it('gives both chips and the fixed combined tiles when both hazards reach level 3', () => {
    const expected = {
      warnings: ['Heat exhaustion possible', 'Risk for sensitive groups'],
      actions: ['stayIndoors', 'airConOn', 'windowsClosed'],
    };
    expect(enviKeywordsFor({ heat: 35, aqhi: 7 }, SUMMER)).toEqual(expected);
    // The same whatever the season, and whichever hazard is higher.
    expect(enviKeywordsFor({ heat: 35, aqhi: 7 }, WINTER)).toEqual(expected);
    expect(enviKeywordsFor({ heat: 55, aqhi: 7 }, WINTER).actions).toEqual(ENVI_DUAL_ACTIONS);
  });

  it('does not combine when only one hazard reaches level 3', () => {
    expect(enviKeywordsFor({ heat: 45, aqhi: 5 }, SUMMER).warnings).toHaveLength(1);
  });
});

describe('keyword tables', () => {
  it('cover every level above the lowest, and only those', () => {
    HAZARD_KINDS.forEach(hazard => {
      const levels = HAZARD_LEVELS[hazard].slice(1);
      expect(Object.keys(ENVI_WARNING_COPY[hazard])).toEqual(levels);
      expect(Object.keys(ENVI_HAZARD_ACTIONS[hazard])).toEqual(levels);
    });
  });

  it('never put more tiles in a set than fit on the card', () => {
    const sets = [
      ...HAZARD_KINDS.flatMap(hazard => Object.values(ENVI_HAZARD_ACTIONS[hazard])),
      ENVI_DUAL_ACTIONS,
      ENVI_CALM_ACTIONS,
    ];
    sets.forEach(set => {
      expect(set.length).toBeGreaterThan(0);
      expect(set.length).toBeLessThanOrEqual(ENVI_KEYWORD_LIMITS.maxTiles);
    });
  });

  const actionIds = Object.keys(ENVI_ACTION_COPY) as EnviActionId[];

  it.each(actionIds)('"%s" has an icon, a short label and a sentence', id => {
    expect(ENVI_ACTION_ICONS[id]).toBeDefined();
    const { label, sentence } = ENVI_ACTION_COPY[id];
    expect(label.split(' ').length).toBeLessThanOrEqual(ENVI_KEYWORD_LIMITS.maxTileWords);
    expect(sentence.length).toBeGreaterThan(label.length);
  });
});

// WCAG relative luminance and contrast ratio of two #RRGGBB colours.
const luminance = (hex: string): number => {
  const [r, g, b] = [1, 3, 5].map(i => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a: string, b: string): number => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

describe('level square contrast', () => {
  it.each(ENVI_LEVELS.map(l => [l.level, l.color, l.textColor] as const))(
    'level %i: number readable on its colour',
    (_level, color, textColor) => {
      expect(contrast(color, textColor)).toBeGreaterThanOrEqual(ENVI_CONFIG.minNumberContrast);
    },
  );
});
