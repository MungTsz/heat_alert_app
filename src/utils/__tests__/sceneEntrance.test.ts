import { reactProgress, walkProgress, walking } from '../sceneEntrance';
import { SCENE_ENTRANCE } from '../../config/sceneConfig';

const { walkMs, reactMs, cruiseShare } = SCENE_ENTRANCE;

describe('walkProgress', () => {
  it('starts off-screen and ends exactly at the spot', () => {
    expect(walkProgress(0)).toBe(0);
    expect(walkProgress(walkMs)).toBeCloseTo(1, 10);
    expect(walkProgress(walkMs * 2)).toBeCloseTo(1, 10);
  });

  it('strolls at an even pace, then slows to a stop (never rushes at the start)', () => {
    const step = walkMs / 100;
    const speedAt = (ms: number) => (walkProgress(ms + step) - walkProgress(ms)) / step;
    const cruise = speedAt(0);
    // Even pace through the cruise part.
    expect(speedAt(walkMs * cruiseShare * 0.5)).toBeCloseTo(cruise, 10);
    // Then always slower, and still moving forward.
    let last = cruise;
    for (let ms = walkMs * cruiseShare + step; ms < walkMs - step; ms += step) {
      const v = speedAt(ms);
      expect(v).toBeLessThanOrEqual(last + 1e-12);
      expect(v).toBeGreaterThan(0);
      last = v;
    }
  });
});

describe('walking / reactProgress', () => {
  it('walks until walkMs, then settles over reactMs', () => {
    expect(walking(walkMs - 1)).toBe(1);
    expect(walking(walkMs)).toBe(0);
    expect(reactProgress(walkMs)).toBe(0);
    expect(reactProgress(walkMs + reactMs / 2)).toBeCloseTo(0.5);
    expect(reactProgress(walkMs + reactMs)).toBe(1);
  });
});
