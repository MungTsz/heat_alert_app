import { dueDigestSlot, nextDigest } from '../alertDigest';
import { DEFAULT_NOTIFICATION_SETTINGS } from '../../config/alertConfig';

// HKT wall-clock time → epoch ms
const hkt = (day: number, hour: number, minute = 0) => Date.UTC(2026, 10, day, hour - 8, minute);
const settings = DEFAULT_NOTIFICATION_SETTINGS; // evening 19:30, morning 07:30

describe('dueDigestSlot', () => {
  it('is due from the slot time until the late window ends', () => {
    expect(dueDigestSlot(hkt(4, 19, 29), settings, {})).toBeNull();
    expect(dueDigestSlot(hkt(4, 19, 30), settings, {})).toBe('evening');
    expect(dueDigestSlot(hkt(4, 21, 29), settings, {})).toBe('evening');
    expect(dueDigestSlot(hkt(4, 21, 31), settings, {})).toBeNull();
  });

  it('is not due again once sent today', () => {
    expect(dueDigestSlot(hkt(4, 19, 45), settings, { evening: '2026-11-04' })).toBeNull();
    expect(dueDigestSlot(hkt(5, 19, 45), settings, { evening: '2026-11-04' })).toBe('evening');
  });

  it('skips a switched-off slot', () => {
    const off = { digests: { ...settings.digests, morning: { enabled: false, minute: 450 } } };
    expect(dueDigestSlot(hkt(4, 7, 45), off, {})).toBeNull();
  });
});

describe('nextDigest', () => {
  it('finds the next slot today, then tomorrow', () => {
    expect(nextDigest(hkt(4, 12), settings)).toEqual({ slot: 'evening', atMs: hkt(4, 19, 30) });
    expect(nextDigest(hkt(4, 20), settings)).toEqual({ slot: 'morning', atMs: hkt(5, 7, 30) });
  });

  it('is null when both digests are off', () => {
    const off = {
      digests: {
        evening: { enabled: false, minute: 1170 },
        morning: { enabled: false, minute: 450 },
      },
    };
    expect(nextDigest(hkt(4, 12), off)).toBeNull();
  });
});
