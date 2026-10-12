import { toHkDateKey, addHkDays, getHkWeekStartKey } from '../hkDate';

describe('toHkDateKey', () => {
  it('formats a date as YYYY-MM-DD in Hong Kong local time', () => {
    // 2026-09-07T10:00:00Z is 2026-09-07T18:00:00+08:00
    expect(toHkDateKey(new Date('2026-09-07T10:00:00Z'))).toBe('2026-09-07');
  });

  it('rolls over to the next HK day for a late-UTC timestamp', () => {
    // 2026-09-07T20:00:00Z is 2026-09-08T04:00:00+08:00
    expect(toHkDateKey(new Date('2026-09-07T20:00:00Z'))).toBe('2026-09-08');
  });

  it('does not roll over for an early-UTC timestamp still in the same HK day', () => {
    // 2026-09-07T01:00:00Z is 2026-09-07T09:00:00+08:00
    expect(toHkDateKey(new Date('2026-09-07T01:00:00Z'))).toBe('2026-09-07');
  });

  it('pads single-digit months and days', () => {
    expect(toHkDateKey(new Date('2026-01-05T01:00:00Z'))).toBe('2026-01-05');
  });
});

describe('addHkDays', () => {
  it('adds days within the same month', () => {
    expect(addHkDays('2026-09-05', 2)).toBe('2026-09-07');
  });

  it('rolls over a month boundary', () => {
    expect(addHkDays('2026-09-30', 1)).toBe('2026-10-01');
  });

  it('rolls over a year boundary', () => {
    expect(addHkDays('2026-12-31', 1)).toBe('2027-01-01');
  });

  it('supports negative offsets', () => {
    expect(addHkDays('2026-09-01', -1)).toBe('2026-08-31');
  });
});

describe('getHkWeekStartKey', () => {
  it('returns the same day when it already is the week start', () => {
    // 2026-10-11 is a Sunday
    expect(getHkWeekStartKey('2026-10-11', 0)).toBe('2026-10-11');
  });

  it('walks back to the preceding Sunday', () => {
    // 2026-10-17 is a Saturday
    expect(getHkWeekStartKey('2026-10-17', 0)).toBe('2026-10-11');
  });

  it('crosses a month boundary', () => {
    // 2026-10-01 is a Thursday
    expect(getHkWeekStartKey('2026-10-01', 0)).toBe('2026-09-27');
  });

  it('crosses a year boundary', () => {
    // 2027-01-01 is a Friday
    expect(getHkWeekStartKey('2027-01-01', 0)).toBe('2026-12-27');
  });

  it('supports a Monday week start', () => {
    // 2026-10-11 is a Sunday, so its Monday-start week began 2026-10-05
    expect(getHkWeekStartKey('2026-10-11', 1)).toBe('2026-10-05');
  });
});
