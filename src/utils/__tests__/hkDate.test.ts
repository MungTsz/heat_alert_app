import { toHkDateKey, addHkDays } from '../hkDate';

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
