// src/utils/sceneMood.ts
// What Home's cartoon scene shows for a pair of readings: one pure function,
// so every reaction is decided (and tested) in one place and the Skia
// components only draw what they're told.
import {
  DogPose,
  DogTongue,
  SCENE_AIR_LEVELS,
  SCENE_HEAT_LEVELS,
  SCENE_LIMITS,
  SCENE_NO_READING,
  SCENE_TIME_CONFIG,
  SceneEyes,
  SceneMouth,
} from '../config/sceneConfig';
import { hazardLevelOf } from './enviUtils';

export type PersonMood = {
  // 'flat' only when there is no reading at all.
  mouth: SceneMouth | 'flat';
  eyes: SceneEyes;
  sadBrows: boolean;
  sweatDrops: number;
  flush: number;
  fanning: boolean;
  cough: boolean;
  mask: boolean;
};

export type DogMood = {
  pose: DogPose;
  tongue: DogTongue;
  droolDrops: number;
  puddle: number;
  tailWagMs: number | null;
  pantMs: number | null;
};

export type EnvironmentMood = {
  isNight: boolean;
  sunGlow: number;
  skyWarmth: number;
  shimmer: number;
  haze: number;
  sparkles: boolean;
  // Heat level for the lawn colour; null = no reading.
  lawnLevel: 1 | 2 | 3 | 4 | 5 | null;
};

export type SceneMood = {
  person: PersonMood;
  dog: DogMood;
  environment: EnvironmentMood;
};

type Level = 1 | 2 | 3 | 4 | 5;

// Worst first wins when the two hazards ask for different faces.
const MOUTH_SEVERITY: SceneMouth[] = ['smile', 'neutral', 'pant', 'frown'];
const EYES_SEVERITY: SceneEyes[] = ['open', 'tired', 'squint'];

const worse = <T>(order: T[], a: T, b: T): T =>
  order.indexOf(a) >= order.indexOf(b) ? a : b;

const asLevel = (level: number | null): Level | null =>
  level === null ? null : (Math.max(1, Math.min(5, level)) as Level);

// A dog with no heat reading just sits there: no tongue, no drool, tail still.
const CALM_DOG: DogMood = {
  pose: 'sit',
  tongue: 'none',
  droolDrops: 0,
  puddle: 0,
  tailWagMs: null,
  pantMs: null,
};

export const isNightHour = (hour: number): boolean =>
  hour < SCENE_TIME_CONFIG.dayStartHour || hour >= SCENE_TIME_CONFIG.dayEndHour;

export const sceneMoodFor = ({
  heatIndexC,
  aqhi,
  hour,
}: {
  heatIndexC: number | null;
  aqhi: number | null;
  hour: number;
}): SceneMood => {
  const heatLevel = asLevel(hazardLevelOf('heat', heatIndexC));
  const airLevel = asLevel(hazardLevelOf('aqhi', aqhi));
  const heat = heatLevel === null ? null : SCENE_HEAT_LEVELS[heatLevel];
  const air = airLevel === null ? null : SCENE_AIR_LEVELS[airLevel];
  const isNight = isNightHour(hour);

  // The face shows whichever hazard is worse; with one reading missing it
  // follows the other, with both missing it stays blank ('flat').
  const faces = [heat?.person, air?.person].filter(
    (face): face is NonNullable<typeof face> => face !== undefined,
  );
  const mouth: PersonMood['mouth'] =
    faces.length === 0
      ? 'flat'
      : faces.map(f => f.mouth).reduce((a, b) => worse(MOUTH_SEVERITY, a, b));
  const eyes =
    faces.length === 0
      ? 'open'
      : faces.map(f => f.eyes).reduce((a, b) => worse(EYES_SEVERITY, a, b));

  const mask = air?.person.mask ?? false;

  const person: PersonMood = {
    mouth,
    eyes,
    sadBrows: faces.some(f => f.sadBrows),
    sweatDrops: Math.min(heat?.person.sweatDrops ?? 0, SCENE_LIMITS.maxSweatDrops),
    flush: heat?.person.flush ?? 0,
    fanning: heat?.person.fanning ?? false,
    // A masked person doesn't also cough out into the air.
    cough: (air?.person.cough ?? false) && !mask,
    mask,
  };

  const dog: DogMood = heat
    ? {
        ...heat.dog,
        droolDrops: Math.min(heat.dog.droolDrops, SCENE_LIMITS.maxDroolDrops),
      }
    : CALM_DOG;

  const environment: EnvironmentMood = {
    isNight,
    sunGlow: heat?.environment.sunGlow ?? SCENE_NO_READING.sunGlow,
    skyWarmth: heat?.environment.skyWarmth ?? 0,
    shimmer:
      isNight && !SCENE_TIME_CONFIG.shimmerAtNight ? 0 : heat?.environment.shimmer ?? 0,
    haze: air?.environment.haze ?? 0,
    sparkles: air?.environment.sparkles ?? false,
    lawnLevel: heatLevel,
  };

  return { person, dog, environment };
};
