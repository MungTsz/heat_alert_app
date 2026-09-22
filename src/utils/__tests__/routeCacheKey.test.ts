import { buildRouteCacheKey } from '../routeCacheKey';

describe('buildRouteCacheKey', () => {
  it('produces the same key for coordinates that round to the same value', () => {
    const a = buildRouteCacheKey({ lat: 22.31991, lon: 114.16941 }, { lat: 22.32131, lon: 114.17341 }, 4);
    const b = buildRouteCacheKey({ lat: 22.319914, lon: 114.169406 }, { lat: 22.321309, lon: 114.173412 }, 4);
    expect(a).toBe(b);
  });

  it('is directional — swapping origin/destination changes the key', () => {
    const forward = buildRouteCacheKey({ lat: 22.3, lon: 114.1 }, { lat: 22.4, lon: 114.2 }, 4);
    const reverse = buildRouteCacheKey({ lat: 22.4, lon: 114.2 }, { lat: 22.3, lon: 114.1 }, 4);
    expect(forward).not.toBe(reverse);
  });

  it('distinguishes coordinates that differ beyond the rounding precision', () => {
    const a = buildRouteCacheKey({ lat: 22.3199, lon: 114.1694 }, { lat: 22.3213, lon: 114.1734 }, 4);
    const b = buildRouteCacheKey({ lat: 22.3205, lon: 114.1694 }, { lat: 22.3213, lon: 114.1734 }, 4);
    expect(a).not.toBe(b);
  });
});
