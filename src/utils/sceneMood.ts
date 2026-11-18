// src/utils/sceneMood.ts
// What Home's cartoon scene shows for a pair of readings: one pure function,
// so every reaction is decided (and tested) in one place and the Skia
// components only draw what they're told.
import {
  DogEyes,
  DogMouth,
  DogPose,
  DogReaction,
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

export type DogMood = DogReaction & {
  // From heat.
  droolDrops: number;
  puddle: number;
  // From air.
  redEyes: boolean;
  teary: boolean;
  runnyNose: boolean;
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

const DOG_POSE_SEVERITY: DogPose[] = ['sit', 'lie'];
const DOG_TONGUE_SEVERITY: DogTongue[] = ['none', 'short', 'long'];
const DOG_MOUTH_SEVERITY: DogMouth[] = ['smile', 'closed', 'pant'];
const DOG_EYES_SEVERITY: DogEyes[] = ['open', 'tired', 'closed'];

// With no reading at all the dog just sits there: mouth closed (no grin),
// tail still, no symptoms.
const CALM_DOG: DogMood = {
  pose: 'sit',
  tongue: 'none',
  mouth: 'closed',
  eyes: 'open',
  tailWagMs: null,
  pantMs: null,
  heavyBreath: false,
  droolDrops: 0,
  puddle: 0,
  redEyes: false,
  teary: false,
  runnyNose: false,
};

// Both hazards act on the same dog: each part takes the worse of the two
// (lying beats sitting, a still tail beats a wag, the faster breathing
// wins), so a hot, smoggy day never looks better than either alone.
const mergeDog = (a: DogReaction, b: DogReaction): DogReaction => {
  const pants = [a.pantMs, b.pantMs].filter((ms): ms is number => ms !== null);
  return {
    pose: worse(DOG_POSE_SEVERITY, a.pose, b.pose),
    tongue: worse(DOG_TONGUE_SEVERITY, a.tongue, b.tongue),
    mouth: worse(DOG_MOUTH_SEVERITY, a.mouth, b.mouth),
    eyes: worse(DOG_EYES_SEVERITY, a.eyes, b.eyes),
    tailWagMs:
      a.tailWagMs === null || b.tailWagMs === null ? null : Math.max(a.tailWagMs, b.tailWagMs),
    pantMs: pants.length === 0 ? null : Math.min(...pants),
    heavyBreath: a.heavyBreath || b.heavyBreath,
  };
};

const reactionOf = (dog: DogReaction): DogReaction => ({
  pose: dog.pose,
  tongue: dog.tongue,
  mouth: dog.mouth,
  eyes: dog.eyes,
  tailWagMs: dog.tailWagMs,
  pantMs: dog.pantMs,
  heavyBreath: dog.heavyBreath,
});

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

  const reactions = [heat?.dog, air?.dog]
    .filter((d): d is NonNullable<typeof d> => d !== undefined)
    .map(reactionOf);
  const dog: DogMood =
    reactions.length === 0
      ? CALM_DOG
      : {
          ...reactions.reduce(mergeDog),
          droolDrops: Math.min(heat?.dog.droolDrops ?? 0, SCENE_LIMITS.maxDroolDrops),
          puddle: heat?.dog.puddle ?? 0,
          redEyes: air?.dog.redEyes ?? false,
          teary: air?.dog.teary ?? false,
          runnyNose: air?.dog.runnyNose ?? false,
        };

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
