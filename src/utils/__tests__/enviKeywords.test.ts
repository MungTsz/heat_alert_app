import { EnviAdviceFor, GENERAL_ADVICE_FOR, enviKeywordsFor } from '../enviKeywords';
import { HAZARD_LEVELS } from '../hazardLevels';
import { DEFAULT_ALERT_PERSON, HAZARD_KINDS } from '../../config/alertConfig';
import { ENVI_ACTION_COPY, ENVI_WARNING_COPY } from '../../config/alertCopy';
import { ENVI_CONFIG, ENVI_LEVELS } from '../../config/enviConfig';
import {
  ENVI_CALM_ACTIONS,
  ENVI_DUAL_ACTIONS,
  ENVI_ESCALATION,
  ENVI_HAZARD_ACTIONS,
  ENVI_KEYWORD_LIMITS,
  ENVI_PERSON_TIPS,
} from '../../config/enviKeywords';
import { ENVI_ACTION_ICONS } from '../../config/enviKeywordIcons';
import { AlertPerson, HazardKind, IdentityGroup } from '../../types/alerts';
import { EnviActionId, LocationContext } from '../../types/envi';

// lucide-react-native ships ESM Jest can't parse. Each icon becomes its own
// name, which is all "every keyword has an icon" needs.
jest.mock('lucide-react-native', () =>
  new Proxy({}, { get: (_target, name) => (name === '__esModule' ? true : String(name)) }),
);

// Heat index (°C): 25 No Caution, 30 Caution, 35 Extreme Caution, 45 Danger,
// 55 Extreme Danger. AQHI: 2 Low, 5 Moderate, 7 High, 9 Very High, 11 Serious.
const SAMPLE_VALUE: Record<HazardKind, Record<string, number>> = {
  heat: { Caution: 30, 'Extreme Caution': 35, Danger: 45, 'Extreme Danger': 55 },
  aqhi: { Moderate: 5, High: 7, 'Very High': 9, Serious: 11 },
};
// The other hazard at its lowest level, so the one under test leads alone.
const LOW: Record<HazardKind, number> = { heat: 25, aqhi: 2 };

const CONTEXTS: readonly LocationContext[] = ['indoors', 'outdoors', 'transit', 'unknown'];

// Noon HKT on the given month's 15th.
const hkNoon = (month: number) => Date.UTC(2026, month - 1, 15, 4);
const SUMMER = hkNoon(8);
const WINTER = hkNoon(1);

const adviceFor = (
  person: Partial<AlertPerson> = {},
  context: LocationContext = 'unknown',
): EnviAdviceFor => ({
  person: { ...DEFAULT_ALERT_PERSON, ...person },
  context,
  source: context === 'unknown' ? 'none' : 'tracking',
});

const who = (...identities: IdentityGroup[]) => ({ identities });

describe('enviKeywordsFor — general advice', () => {
  it('shows nothing without readings', () => {
    expect(enviKeywordsFor({ heat: null, aqhi: null }, SUMMER)).toEqual({
      warnings: [],
      actions: [],
      sheetActions: [],
      medicineNote: false,
    });
  });

  it('shows only the calm tile at level 1, whoever and wherever', () => {
    expect(enviKeywordsFor({ heat: 25, aqhi: 2 }, SUMMER)).toMatchObject({
      warnings: [],
      actions: ['enjoyOutdoors'],
    });
    expect(enviKeywordsFor({ heat: null, aqhi: 2 }, SUMMER).actions).toEqual(['enjoyOutdoors']);
    const asthmaOutdoors = adviceFor({ ...who('asthma'), takesRegularMedicine: true }, 'outdoors');
    expect(enviKeywordsFor({ heat: 25, aqhi: 2 }, SUMMER, asthmaOutdoors)).toMatchObject({
      actions: ['enjoyOutdoors'],
      sheetActions: ['enjoyOutdoors'],
      medicineNote: false,
    });
  });

  it('gives the higher hazard’s chip and tiles', () => {
    expect(enviKeywordsFor({ heat: 45, aqhi: 5 }, WINTER)).toMatchObject({
      warnings: ['Heat stroke possible'],
      actions: ['avoidMidday', 'stayCool', 'drinkWater'],
    });
    expect(enviKeywordsFor({ heat: 30, aqhi: 9 }, SUMMER)).toMatchObject({
      warnings: ['Risk for everyone'],
      actions: ['lessExertion', 'avoidBusyRoads', 'lessTimeOutside'],
    });
  });

  it('uses the one hazard there is when the other is missing', () => {
    expect(enviKeywordsFor({ heat: 55, aqhi: null }, WINTER)).toMatchObject({
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
    expect(enviKeywordsFor({ heat: 35, aqhi: 7 }, SUMMER)).toMatchObject(expected);
    // The same whatever the season, and whichever hazard is higher.
    expect(enviKeywordsFor({ heat: 35, aqhi: 7 }, WINTER)).toMatchObject(expected);
    expect(enviKeywordsFor({ heat: 55, aqhi: 7 }, WINTER).actions).toEqual(
      ENVI_DUAL_ACTIONS.unknown,
    );
  });

  it('does not combine when only one hazard reaches level 3', () => {
    expect(enviKeywordsFor({ heat: 45, aqhi: 5 }, SUMMER).warnings).toHaveLength(1);
  });
});

describe('enviKeywordsFor — where you are', () => {
  // Every hazard × level × context, for a general adult: exactly the table.
  HAZARD_KINDS.forEach(hazard => {
    HAZARD_LEVELS[hazard].slice(1).forEach(level => {
      it.each(CONTEXTS)(`${hazard} ${level}, %s: the table's tiles`, context => {
        const other: HazardKind = hazard === 'heat' ? 'aqhi' : 'heat';
        const current = { [hazard]: SAMPLE_VALUE[hazard][level], [other]: LOW[other] } as Record<
          HazardKind,
          number
        >;
        expect(enviKeywordsFor(current, SUMMER, adviceFor({}, context)).actions).toEqual(
          ENVI_HAZARD_ACTIONS[hazard][level][context],
        );
      });
    });
  });

  it.each(CONTEXTS)('heat and poor air together, %s: the fixed combined set', context => {
    expect(
      enviKeywordsFor({ heat: 45, aqhi: 9 }, SUMMER, adviceFor({}, context)).actions,
    ).toEqual(ENVI_DUAL_ACTIONS[context]);
  });

  it('never tells someone outdoors or on the move to use air-con at home', () => {
    (['outdoors', 'transit'] as const).forEach(context => {
      HAZARD_KINDS.forEach(hazard =>
        Object.values(ENVI_HAZARD_ACTIONS[hazard]).forEach(byContext => {
          expect(byContext[context]).not.toContain('airConOn');
          expect(byContext[context]).not.toContain('keepRoomsCool');
        }),
      );
      expect(ENVI_DUAL_ACTIONS[context]).not.toContain('airConOn');
    });
  });

  it('advises the owner wherever they are — at Mum’s home it is the owner’s indoor advice', () => {
    // Visiting an older parent: indoors (a saved place), advice for the
    // owner's asthma, never the older adult's "Drink before thirsty".
    const atMums = enviKeywordsFor({ heat: 45, aqhi: 2 }, SUMMER, adviceFor(who('asthma'), 'indoors'));
    expect(atMums.actions).toEqual(['airConOn', 'drinkWater', 'carryInhaler']);
    expect(atMums.sheetActions).not.toContain('drinkBeforeThirsty');
  });
});

describe('enviKeywordsFor — who you are', () => {
  it('adds the person’s tip in a free slot', () => {
    expect(
      enviKeywordsFor({ heat: 30, aqhi: 2 }, SUMMER, adviceFor(who('pregnant'), 'indoors')).actions,
    ).toEqual(['drinkWater', 'keepRoomsCool', 'restOften']);
  });

  it('puts the person’s tip in place of the last tile when the row is full', () => {
    expect(
      enviKeywordsFor({ heat: 35, aqhi: 2 }, SUMMER, adviceFor(who('pregnant'), 'outdoors')).actions,
    ).toEqual(['restInShade', 'drinkWater', 'restOften']);
  });

  it('puts a tip that says a general tile more precisely in that tile’s place', () => {
    expect(
      enviKeywordsFor({ heat: 35, aqhi: 2 }, SUMMER, adviceFor(who('older'), 'indoors')).actions,
    ).toEqual(['keepRoomsCool', 'drinkBeforeThirsty', 'avoidMiddayOutings']);
  });

  it('puts the highest-priority tip on the card and the rest in the sheet', () => {
    const result = enviKeywordsFor(
      { heat: 45, aqhi: 2 },
      SUMMER,
      adviceFor({ identities: ['older', 'pregnant', 'asthma'], takesRegularMedicine: true }, 'indoors'),
    );
    expect(result.actions).toEqual(['airConOn', 'drinkWater', 'carryInhaler']);
    // In the sheet the older adult's "Drink before thirsty" takes the place
    // of "Drink water" rather than saying it twice.
    expect(result.sheetActions).toEqual([
      'airConOn',
      'drinkBeforeThirsty',
      'carryInhaler',
      'restOften',
      'keepMedicineCool',
    ]);
  });

  it('says a shared tip once', () => {
    const result = enviKeywordsFor(
      { heat: 45, aqhi: 2 },
      SUMMER,
      adviceFor(who('heartLung', 'otherChronic')),
    );
    expect(result.actions.filter(id => id === 'followCarePlan')).toHaveLength(1);
    expect(result.sheetActions).toEqual(result.actions);
  });

  it('never says one thing twice in the sheet', () => {
    const everyone = adviceFor({
      identities: ['older', 'pregnant', 'asthma', 'heartLung', 'otherChronic'],
      takesRegularMedicine: true,
    });
    CONTEXTS.forEach(context =>
      [30, 35, 45, 55].forEach(heat => {
        const { sheetActions } = enviKeywordsFor({ heat, aqhi: 7 }, SUMMER, { ...everyone, context });
        expect(new Set(sheetActions).size).toBe(sheetActions.length);
        expect(sheetActions.includes('drinkWater') && sheetActions.includes('drinkBeforeThirsty')).toBe(
          false,
        );
      }),
    );
  });

  it('shows each tip only from its own level', () => {
    // Asthma: heat or AQHI at level 3.
    const asthma = adviceFor(who('asthma'));
    expect(enviKeywordsFor({ heat: 25, aqhi: 5 }, WINTER, asthma).actions).not.toContain('carryInhaler');
    expect(enviKeywordsFor({ heat: 25, aqhi: 7 }, WINTER, asthma).actions).toContain('carryInhaler');
    expect(enviKeywordsFor({ heat: 35, aqhi: 2 }, SUMMER, asthma).actions).toContain('carryInhaler');
    // Other long-term condition: heat only.
    const chronic = adviceFor(who('otherChronic'));
    expect(enviKeywordsFor({ heat: 25, aqhi: 9 }, WINTER, chronic).actions).not.toContain('followCarePlan');
    expect(enviKeywordsFor({ heat: 35, aqhi: 2 }, SUMMER, chronic).actions).toContain('followCarePlan');
    // Pregnant: heat from level 2, even when air quality leads.
    expect(
      enviKeywordsFor({ heat: 30, aqhi: 7 }, WINTER, adviceFor(who('pregnant'))).actions,
    ).toContain('restOften');
  });

  it('adds the medicine tile from heat level 3, and the doctor line from heat level 2', () => {
    const medicine = adviceFor({ takesRegularMedicine: true });
    const warm = enviKeywordsFor({ heat: 30, aqhi: 2 }, SUMMER, medicine);
    expect(warm.actions).not.toContain('keepMedicineCool');
    expect(warm.medicineNote).toBe(true);
    expect(enviKeywordsFor({ heat: 35, aqhi: 2 }, SUMMER, medicine).actions).toContain(
      'keepMedicineCool',
    );
    // Poor air alone is not about medicine in the heat.
    expect(enviKeywordsFor({ heat: 25, aqhi: 9 }, WINTER, medicine).medicineNote).toBe(false);
    expect(enviKeywordsFor({ heat: 30, aqhi: 2 }, SUMMER).medicineNote).toBe(false);
  });
});

describe('enviKeywordsFor — going indoors sooner', () => {
  it('starts with "Go indoors soon" for someone more at risk who is outdoors from level 4', () => {
    expect(
      enviKeywordsFor({ heat: 45, aqhi: 2 }, SUMMER, adviceFor(who('pregnant'), 'outdoors')).actions,
    ).toEqual(['goIndoorsSoon', 'drinkWater', 'restOften']);
    // Regular medicine alone counts as more at risk.
    expect(
      enviKeywordsFor({ heat: 45, aqhi: 2 }, SUMMER, adviceFor({ takesRegularMedicine: true }, 'outdoors'))
        .actions[0],
    ).toBe(ENVI_ESCALATION.action);
  });

  it('leaves general adults, other places and lower levels alone', () => {
    expect(
      enviKeywordsFor({ heat: 45, aqhi: 2 }, SUMMER, adviceFor({}, 'outdoors')).actions[0],
    ).toBe('moveToShade');
    expect(
      enviKeywordsFor({ heat: 45, aqhi: 2 }, SUMMER, adviceFor(who('older'), 'indoors')).actions,
    ).not.toContain('goIndoorsSoon');
    expect(
      enviKeywordsFor({ heat: 35, aqhi: 2 }, SUMMER, adviceFor(who('older'), 'outdoors')).actions,
    ).not.toContain('goIndoorsSoon');
  });

  it('never softens "Go indoors now", and drops a weaker way of saying it', () => {
    expect(
      enviKeywordsFor({ heat: 55, aqhi: 2 }, SUMMER, adviceFor(who('older'), 'outdoors')).actions[0],
    ).toBe('goIndoorsNow');
    expect(
      enviKeywordsFor({ heat: 25, aqhi: 9 }, WINTER, adviceFor(who('asthma'), 'outdoors')).actions,
    ).toEqual(['goIndoorsSoon', 'avoidBusyRoads', 'carryInhaler']);
  });
});

describe('keyword tables', () => {
  it('cover every level above the lowest, and only those, in every context', () => {
    HAZARD_KINDS.forEach(hazard => {
      const levels = HAZARD_LEVELS[hazard].slice(1);
      expect(Object.keys(ENVI_WARNING_COPY[hazard])).toEqual(levels);
      expect(Object.keys(ENVI_HAZARD_ACTIONS[hazard])).toEqual(levels);
      levels.forEach(level =>
        expect(Object.keys(ENVI_HAZARD_ACTIONS[hazard][level]).sort()).toEqual([...CONTEXTS].sort()),
      );
    });
    expect(Object.keys(ENVI_DUAL_ACTIONS).sort()).toEqual([...CONTEXTS].sort());
  });

  it('never put more tiles in a set than fit on the card, or one tile twice', () => {
    const sets = [
      ...HAZARD_KINDS.flatMap(hazard =>
        Object.values(ENVI_HAZARD_ACTIONS[hazard]).flatMap(byContext => Object.values(byContext)),
      ),
      ...Object.values(ENVI_DUAL_ACTIONS),
      ENVI_CALM_ACTIONS,
    ];
    sets.forEach(set => {
      expect(set.length).toBeGreaterThan(0);
      expect(set.length).toBeLessThanOrEqual(ENVI_KEYWORD_LIMITS.maxTiles);
      expect(new Set(set).size).toBe(set.length);
    });
  });

  it('use every keyword somewhere, so no copy goes stale', () => {
    const used = new Set<EnviActionId>([
      ...HAZARD_KINDS.flatMap(hazard =>
        Object.values(ENVI_HAZARD_ACTIONS[hazard]).flatMap(byContext =>
          Object.values(byContext).flat(),
        ),
      ),
      ...Object.values(ENVI_DUAL_ACTIONS).flat(),
      ...ENVI_CALM_ACTIONS,
      ...ENVI_PERSON_TIPS.map(tip => tip.action),
      ENVI_ESCALATION.action,
    ]);
    expect([...used].sort()).toEqual(Object.keys(ENVI_ACTION_COPY).sort());
  });

  const actionIds = Object.keys(ENVI_ACTION_COPY) as EnviActionId[];

  it.each(actionIds)('"%s" has an icon, a short label and a sentence', id => {
    expect(ENVI_ACTION_ICONS[id]).toBeDefined();
    const { label, sentence } = ENVI_ACTION_COPY[id];
    expect(label.split(' ').length).toBeLessThanOrEqual(ENVI_KEYWORD_LIMITS.maxTileWords);
    expect(sentence.length).toBeGreaterThan(label.length);
  });

  it('use the general advice when nothing is known', () => {
    expect(GENERAL_ADVICE_FOR).toMatchObject({ context: 'unknown', source: 'none' });
    expect(GENERAL_ADVICE_FOR.person).toEqual(DEFAULT_ALERT_PERSON);
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
