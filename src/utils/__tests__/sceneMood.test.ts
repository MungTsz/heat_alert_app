import { sceneMoodFor, isNightHour } from '../sceneMood';
import {
  SCENE_AIR_LEVELS,
  SCENE_HEAT_LEVELS,
  SCENE_LIMITS,
  SCENE_TIME_CONFIG,
} from '../../config/sceneConfig';

import { SCENE_SAMPLE_READINGS } from '../sceneSamples';
import { hazardLevelOf } from '../enviUtils';

const NOON = 12;
const MIDNIGHT = 0;
// One reading inside each level, mildest first (the preview's samples).
const HEAT_BY_LEVEL = SCENE_SAMPLE_READINGS.heat;
const AQHI_BY_LEVEL = SCENE_SAMPLE_READINGS.aqhi;

const LEVELS = [1, 2, 3, 4, 5] as const;

describe('SCENE_SAMPLE_READINGS', () => {
  it('has one reading inside each level, in order', () => {
    expect(HEAT_BY_LEVEL.map(v => hazardLevelOf('heat', v))).toEqual([...LEVELS]);
    expect(AQHI_BY_LEVEL.map(v => hazardLevelOf('aqhi', v))).toEqual([...LEVELS]);
  });
});

describe('sceneMoodFor', () => {
  it('shows no reaction at all without readings', () => {
    const mood = sceneMoodFor({ heatIndexC: null, aqhi: null, hour: NOON });
    expect(mood.person).toEqual({
      mouth: 'flat',
      eyes: 'open',
      sadBrows: false,
      sweatDrops: 0,
      flush: 0,
      fanning: false,
      cough: false,
      mask: false,
    });
    expect(mood.dog).toMatchObject({
      pose: 'sit',
      tongue: 'none',
      mouth: 'closed',
      tailWagMs: null,
      pantMs: null,
      droolDrops: 0,
      puddle: 0,
    });
    expect(mood.environment).toMatchObject({ haze: 0, sparkles: false, shimmer: 0, lawnLevel: null });
  });

  it('the dog cools off by drooling and lying down, more as heat rises', () => {
    const dogs = HEAT_BY_LEVEL.map(h => sceneMoodFor({ heatIndexC: h, aqhi: null, hour: NOON }).dog);
    for (let i = 1; i < dogs.length; i++) {
      expect(dogs[i].droolDrops).toBeGreaterThanOrEqual(dogs[i - 1].droolDrops);
      expect(dogs[i].puddle).toBeGreaterThanOrEqual(dogs[i - 1].puddle);
    }
    expect(dogs[0].droolDrops).toBe(0);
    expect(dogs[4].droolDrops).toBeGreaterThan(0);
    // Once lying down it stays down at every hotter level.
    const firstLie = dogs.findIndex(d => d.pose === 'lie');
    expect(firstLie).toBeGreaterThan(0);
    dogs.slice(firstLie).forEach(d => expect(d.pose).toBe('lie'));
  });

  it('the dog pants harder as heat rises, mouth open whenever it pants', () => {
    const dogs = HEAT_BY_LEVEL.map(h => sceneMoodFor({ heatIndexC: h, aqhi: null, hour: NOON }).dog);
    expect(dogs[0].pantMs).toBeNull();
    for (let i = 2; i < dogs.length; i++) {
      // Faster breathing (shorter breath) at every hotter level.
      expect(dogs[i].pantMs!).toBeLessThan(dogs[i - 1].pantMs!);
    }
    expect(dogs[4]).toMatchObject({ tongue: 'long', heavyBreath: true });
  });

  it('every table keeps the dog\'s mouth open exactly when it pants', () => {
    LEVELS.forEach(level => {
      [SCENE_HEAT_LEVELS[level].dog, SCENE_AIR_LEVELS[level].dog].forEach(dog => {
        expect(dog.mouth === 'pant').toBe(dog.pantMs !== null);
      });
    });
  });

  it('the dog grows listless in dirty air: no grin, no wagging, then lies down', () => {
    const dogs = AQHI_BY_LEVEL.map(a => sceneMoodFor({ heatIndexC: null, aqhi: a, hour: NOON }).dog);
    expect(dogs[0].mouth).toBe('smile');
    dogs.slice(1).forEach(d => expect(d.mouth).not.toBe('smile'));
    // High and up: no interest in playing.
    dogs.slice(2).forEach(d => expect(d.tailWagMs).toBeNull());
    // Very High and up: fast breathing at rest, lying down.
    dogs.slice(3).forEach(d => {
      expect(d.pantMs).not.toBeNull();
      expect(d.pose).toBe('lie');
    });
    // Air never makes the dog drool — that's a heat reaction.
    dogs.forEach(d => expect(d.droolDrops).toBe(0));
  });

  it('a hot, smoggy day is never easier on the dog than either hazard alone', () => {
    const hot = sceneMoodFor({ heatIndexC: HEAT_BY_LEVEL[2], aqhi: null, hour: NOON }).dog;
    const smog = sceneMoodFor({ heatIndexC: null, aqhi: AQHI_BY_LEVEL[3], hour: NOON }).dog;
    const both = sceneMoodFor({ heatIndexC: HEAT_BY_LEVEL[2], aqhi: AQHI_BY_LEVEL[3], hour: NOON }).dog;
    expect(both.pose).toBe('lie'); // from the air
    expect(both.tongue).toBe(hot.tongue); // long, from the heat
    expect(both.pantMs).toBe(Math.min(hot.pantMs!, smog.pantMs!));
    expect(both.droolDrops).toBe(hot.droolDrops);
    expect(both.tailWagMs).toBeNull();
  });

  it('never gives the dog sweat', () => {
    // Dogs don't sweat: the dog's mood has no sweat field, at any level.
    LEVELS.forEach(level => {
      expect(Object.keys(SCENE_HEAT_LEVELS[level].dog)).not.toContain('sweatDrops');
      expect(Object.keys(SCENE_AIR_LEVELS[level].dog)).not.toContain('sweatDrops');
    });
  });

  it('the person sweats more as heat rises, never past the drawable cap', () => {
    const drops = HEAT_BY_LEVEL.map(
      h => sceneMoodFor({ heatIndexC: h, aqhi: null, hour: NOON }).person.sweatDrops,
    );
    expect(drops[0]).toBe(0);
    for (let i = 1; i < drops.length; i++) expect(drops[i]).toBeGreaterThanOrEqual(drops[i - 1]);
    drops.forEach(d => expect(d).toBeLessThanOrEqual(SCENE_LIMITS.maxSweatDrops));
  });

  it('keeps drool within the drawable cap', () => {
    LEVELS.forEach(level =>
      expect(SCENE_HEAT_LEVELS[level].dog.droolDrops).toBeLessThanOrEqual(SCENE_LIMITS.maxDroolDrops),
    );
  });

  it('haze thickens with AQHI, sparkles only for clean air', () => {
    const envs = AQHI_BY_LEVEL.map(a => sceneMoodFor({ heatIndexC: null, aqhi: a, hour: NOON }).environment);
    expect(envs[0].haze).toBe(0);
    expect(envs[0].sparkles).toBe(true);
    for (let i = 1; i < envs.length; i++) {
      expect(envs[i].haze).toBeGreaterThan(envs[i - 1].haze);
      expect(envs[i].sparkles).toBe(false);
    }
  });

  it('a masked person does not also cough', () => {
    LEVELS.forEach(level => {
      const mood = sceneMoodFor({ heatIndexC: null, aqhi: AQHI_BY_LEVEL[level - 1], hour: NOON });
      expect(mood.person.mask && mood.person.cough).toBe(false);
      expect(mood.person.mask).toBe(SCENE_AIR_LEVELS[level].person.mask);
    });
  });

  it('the face follows the worse hazard', () => {
    // Clean air but extreme heat: the heat face wins.
    const hot = sceneMoodFor({ heatIndexC: HEAT_BY_LEVEL[4], aqhi: AQHI_BY_LEVEL[0], hour: NOON });
    expect(hot.person.mouth).toBe(SCENE_HEAT_LEVELS[5].person.mouth);
    // Cool but serious air: the air face wins.
    const smoggy = sceneMoodFor({ heatIndexC: HEAT_BY_LEVEL[0], aqhi: AQHI_BY_LEVEL[4], hour: NOON });
    expect(smoggy.person.eyes).toBe(SCENE_AIR_LEVELS[5].person.eyes);
    expect(smoggy.person.sadBrows).toBe(true);
  });

  it('turns heat shimmer off at night when configured to', () => {
    const night = sceneMoodFor({ heatIndexC: HEAT_BY_LEVEL[4], aqhi: null, hour: MIDNIGHT });
    expect(night.environment.isNight).toBe(true);
    expect(night.environment.shimmer).toBe(
      SCENE_TIME_CONFIG.shimmerAtNight ? SCENE_HEAT_LEVELS[5].environment.shimmer : 0,
    );
    // The characters still react to a hot night.
    expect(night.dog.pose).toBe(SCENE_HEAT_LEVELS[5].dog.pose);
  });
});

describe('isNightHour', () => {
  it('follows SCENE_TIME_CONFIG', () => {
    expect(isNightHour(SCENE_TIME_CONFIG.dayStartHour)).toBe(false);
    expect(isNightHour(SCENE_TIME_CONFIG.dayStartHour - 1)).toBe(true);
    expect(isNightHour(SCENE_TIME_CONFIG.dayEndHour - 1)).toBe(false);
    expect(isNightHour(SCENE_TIME_CONFIG.dayEndHour)).toBe(true);
  });
});
