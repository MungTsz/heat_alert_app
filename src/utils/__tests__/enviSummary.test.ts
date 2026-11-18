import { enviSummaryFor } from '../enviSummary';
import { ENVI_SUMMARY_COPY } from '../../config/alertCopy';
import { HAZARD_KINDS } from '../../config/alertConfig';
import { HAZARD_LEVELS } from '../hazardLevels';

// Heat index (°C): 25 No Caution, 30 Caution, 35 Extreme Caution, 45 Danger,
// 55 Extreme Danger. AQHI: 2 Low, 5 Moderate, 7 High, 9 Very High, 11 Serious.

// Noon HKT on the given month's 15th.
const hkNoon = (month: number) => Date.UTC(2026, month - 1, 15, 4);
const SUMMER = hkNoon(8);
const WINTER = hkNoon(1);

describe('enviSummaryFor', () => {
  it('is null without readings', () => {
    expect(enviSummaryFor({ heat: null, aqhi: null }, SUMMER)).toBeNull();
  });

  it('describes the one reading there is', () => {
    expect(enviSummaryFor({ heat: 35, aqhi: null }, SUMMER)).toBe("It's hot.");
    expect(enviSummaryFor({ heat: null, aqhi: 7 }, SUMMER)).toBe('Air quality is poor.');
  });

  it('puts the concern after "but" when the other hazard is fine', () => {
    expect(enviSummaryFor({ heat: 45, aqhi: 2 }, WINTER)).toBe(
      "Air quality is good, but it's very hot.",
    );
    expect(enviSummaryFor({ heat: 25, aqhi: 9 }, SUMMER)).toBe(
      "It's not too hot, but air quality is very poor.",
    );
  });

  it('puts the higher hazard first when both are raised', () => {
    expect(enviSummaryFor({ heat: 55, aqhi: 5 }, WINTER)).toBe(
      "It's dangerously hot and air quality is fair.",
    );
    // A tie: the season's hazard first.
    expect(enviSummaryFor({ heat: 35, aqhi: 7 }, SUMMER)).toBe("It's hot and air quality is poor.");
    expect(enviSummaryFor({ heat: 35, aqhi: 7 }, WINTER)).toBe("Air quality is poor and it's hot.");
  });

  it('reads calmly when both are at the lowest level', () => {
    expect(enviSummaryFor({ heat: 25, aqhi: 2 }, SUMMER)).toBe(
      "Air quality is good and it's not too hot.",
    );
  });

  it('has a phrase for every level of both hazards', () => {
    HAZARD_KINDS.forEach(hazard => {
      expect(Object.keys(ENVI_SUMMARY_COPY[hazard])).toEqual(HAZARD_LEVELS[hazard]);
    });
  });
});
