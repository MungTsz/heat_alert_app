import { sceneMoodFor, isNightHour } from '../sceneMood';
import {
  SCENE_AIR_LEVELS,
  SCENE_HEAT_LEVELS,
  SCENE_LIMITS,
  SCENE_TIME_CONFIG,
} from '../../config/sceneConfig';

const NOON = 12;
const MIDNIGHT = 0;
// One heat index (°C) inside each of the five HEAT_INDEX_ZONES, mildest first.
const HEAT_BY_LEVEL = [24, 29, 36, 45, 54];
// One AQHI inside each of the five AQHI bands, Low first.
const AQHI_BY_LEVEL = [2, 5, 7, 9, 11];

const LEVELS = [1, 2, 3, 4, 5] as const;

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
    expect(mood.dog).toMatchObject({ pose: 'sit', tongue: 'none', droolDrops: 0, puddle: 0 });
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

  it('never gives the dog sweat', () => {
    // Dogs don't sweat: the dog's mood has no sweat field, at any level.
    LEVELS.forEach(level => {
      expect(Object.keys(SCENE_HEAT_LEVELS[level].dog)).not.toContain('sweatDrops');
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
