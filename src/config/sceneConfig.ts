// src/config/sceneConfig.ts
// Everything tunable about Home's cartoon scene (src/components/scene/*):
// where things sit, the palette, how long each loop takes, and — the part
// that carries meaning — how the person, the dog and the place react at
// each heat index and AQHI level.
//
// The scene is an at-a-glance mood picture, not an instrument: the exact
// numbers are in the side bar and the Environmental Index card, so the
// scene never draws a number, a scale or a gauge (that is why there is no
// thermometer). Heat shows through the sun, the sky, the grass, the shimmer
// over the ground and how the two characters cope; air quality through how
// far you can see (haze over the hills and towers) and the person's
// cough / mask.
//
// Both tables are indexed by the hazard's own level 1-5 (hazardLevelOf:
// heat No Caution … Extreme Danger, AQHI Low … Serious), so the scene can
// never classify a reading differently from the cards and the alerts.

export type SceneMouth = 'smile' | 'neutral' | 'pant' | 'frown';
export type SceneEyes = 'open' | 'tired' | 'squint';
export type DogPose = 'sit' | 'lie';
export type DogTongue = 'none' | 'short' | 'long';

export type HeatSceneLevel = {
  person: {
    mouth: SceneMouth;
    eyes: SceneEyes;
    sadBrows: boolean;
    sweatDrops: number; // ≤ SCENE_LIMITS.maxSweatDrops
    flush: number; // cheek blush opacity, 0-1
    fanning: boolean;
  };
  // Dogs don't sweat — they cool off by panting, drooling and lying flat on
  // the coolest ground they can find, so that is what the dog does.
  dog: {
    pose: DogPose;
    tongue: DogTongue;
    droolDrops: number; // ≤ SCENE_LIMITS.maxDroolDrops
    puddle: number; // drool puddle size, 0-1
    tailWagMs: number | null; // one wag; null = tail still (too hot to bother)
    pantMs: number | null; // one breath; null = calm breathing
  };
  environment: {
    sunGlow: number; // 0-1
    skyWarmth: number; // how far the low sky tints towards SCENE_PALETTE.sky*.hot, 0-1
    shimmer: number; // heat shimmer over the ground, 0-1
  };
};

export type AirSceneLevel = {
  person: {
    mouth: SceneMouth;
    eyes: SceneEyes;
    sadBrows: boolean;
    cough: boolean;
    mask: boolean;
  };
  environment: {
    haze: number; // 0 = clear view to the hills, 1 = hills gone
    sparkles: boolean; // the "fresh air" glints, only for clean air
  };
};

// Heat index level 1-5 → reactions. Thresholds come from HEAT_INDEX_ZONES.
export const SCENE_HEAT_LEVELS: Record<1 | 2 | 3 | 4 | 5, HeatSceneLevel> = {
  // No Caution
  1: {
    person: { mouth: 'smile', eyes: 'open', sadBrows: false, sweatDrops: 0, flush: 0, fanning: false },
    dog: { pose: 'sit', tongue: 'none', droolDrops: 0, puddle: 0, tailWagMs: 260, pantMs: null },
    environment: { sunGlow: 0.25, skyWarmth: 0, shimmer: 0 },
  },
  // Caution
  2: {
    person: { mouth: 'smile', eyes: 'open', sadBrows: false, sweatDrops: 1, flush: 0, fanning: false },
    dog: { pose: 'sit', tongue: 'short', droolDrops: 0, puddle: 0, tailWagMs: 420, pantMs: 520 },
    environment: { sunGlow: 0.45, skyWarmth: 0.15, shimmer: 0 },
  },
  // Extreme Caution
  3: {
    person: { mouth: 'neutral', eyes: 'open', sadBrows: false, sweatDrops: 2, flush: 0.35, fanning: true },
    dog: { pose: 'sit', tongue: 'long', droolDrops: 1, puddle: 0, tailWagMs: 700, pantMs: 380 },
    environment: { sunGlow: 0.65, skyWarmth: 0.35, shimmer: 0.4 },
  },
  // Danger — the dog gives up and lies flat.
  4: {
    person: { mouth: 'pant', eyes: 'tired', sadBrows: false, sweatDrops: 3, flush: 0.6, fanning: true },
    dog: { pose: 'lie', tongue: 'long', droolDrops: 2, puddle: 0.6, tailWagMs: null, pantMs: 300 },
    environment: { sunGlow: 0.85, skyWarmth: 0.6, shimmer: 0.75 },
  },
  // Extreme Danger
  5: {
    person: { mouth: 'frown', eyes: 'squint', sadBrows: true, sweatDrops: 4, flush: 0.85, fanning: true },
    dog: { pose: 'lie', tongue: 'long', droolDrops: 3, puddle: 1, tailWagMs: null, pantMs: 240 },
    environment: { sunGlow: 1, skyWarmth: 0.85, shimmer: 1 },
  },
};

// AQHI level 1-5 → reactions. Thresholds come from aqhiUtils.ts.
export const SCENE_AIR_LEVELS: Record<1 | 2 | 3 | 4 | 5, AirSceneLevel> = {
  // Low
  1: {
    person: { mouth: 'smile', eyes: 'open', sadBrows: false, cough: false, mask: false },
    environment: { haze: 0, sparkles: true },
  },
  // Moderate
  2: {
    person: { mouth: 'neutral', eyes: 'open', sadBrows: false, cough: false, mask: false },
    environment: { haze: 0.3, sparkles: false },
  },
  // High
  3: {
    person: { mouth: 'neutral', eyes: 'open', sadBrows: false, cough: true, mask: false },
    environment: { haze: 0.55, sparkles: false },
  },
  // Very High
  4: {
    person: { mouth: 'frown', eyes: 'tired', sadBrows: true, cough: false, mask: true },
    environment: { haze: 0.78, sparkles: false },
  },
  // Serious
  5: {
    person: { mouth: 'frown', eyes: 'squint', sadBrows: true, cough: false, mask: true },
    environment: { haze: 0.95, sparkles: false },
  },
};

// Without a reading the scene shows no reaction to that hazard at all: a
// smile would claim it's fine just as sweat or a mask would claim it isn't.
// The sun still shines (it's a sky, not a reading).
export const SCENE_NO_READING = {
  sunGlow: 0.3,
};

// Hard caps so each component can call a fixed number of hooks.
export const SCENE_LIMITS = {
  maxSweatDrops: 4,
  maxDroolDrops: 3,
  shimmerLines: 5,
  hazeBands: 3,
  sparkles: 6,
};

// Day is from dayStartHour (inclusive) to dayEndHour (exclusive), phone time.
export const SCENE_TIME_CONFIG = {
  dayStartHour: 6,
  dayEndHour: 18,
  // Heat shimmer is a sunlit-ground effect; at night heat shows through the
  // characters (and the warm sky) only.
  shimmerAtNight: false,
};

// Where things sit, as fractions of the canvas or in px.
export const SCENE_LAYOUT = {
  horizonFraction: 0.3, // the lawn's top edge, from the canvas top
  groundOffset: 15, // characters stand this far below the lawn's edge
  shadowBelowGround: 16, // the lowest drawn pixel below the feet
  waterHeight: 14, // harbour strip between the skyline and the lawn
  // The pair sits left of centre so the side bar (right edge) never covers
  // them when open.
  personXFraction: 0.52,
  dogOffsetX: -70, // dog's ground point relative to the person
  characterScale: 1.1,
  sunXFraction: 0.2,
  sunAboveHorizon: 128,
  sunRadius: 24,
};

// Loop lengths (ms) of the animations whose speed doesn't carry meaning.
export const SCENE_TIMING = {
  breathMs: 2400,
  fanMs: 420,
  sweatMs: 1900,
  coughMs: 950,
  droolMs: 2100,
  shimmerMs: 2600,
  hazeDriftMs: 26000,
  sparkleMs: 4200,
  sunPulseMs: 3200,
  // With Reduce Motion on, every loop holds still at this point of its cycle
  // (mid-way, so drops and puffs are visible rather than faded out).
  reducedMotionFrame: 0.45,
};

export const SCENE_PALETTE = {
  skyDay: { top: '#7DB4E2', bottom: '#DCEEFB', hot: '#FCE2BC' },
  skyNight: { top: '#13253D', bottom: '#3D5672', hot: '#5D4A55' },
  sun: { core: '#FFE27A', glow: '#FFB74D', hazy: '#F2A65A' },
  moon: '#F4F1E1',
  hills: { day: '#86ADA2', night: '#203447' },
  farTowers: { day: '#9AAFC4', night: '#283B53' },
  nearTowers: { day: '#6C839C', night: '#1D2D42' },
  windows: { day: 'rgba(255,255,255,0.32)', night: '#FFD98A' },
  water: { day: '#6AA4CC', night: '#1B344E' },
  waterGlint: 'rgba(255,255,255,0.45)',
  // Lawn by heat level (1 lush → 5 scorched); `none` without a reading.
  lawn: {
    none: '#68A05C',
    1: '#5FA35A',
    2: '#73A956',
    3: '#93AB50',
    4: '#B1A44B',
    5: '#C29548',
  } as Record<'none' | 1 | 2 | 3 | 4 | 5, string>,
  lawnDeep: '#3F6E3D', // the lawn darkens towards the bottom of the screen
  lawnNightMix: { color: '#0E1A12', amount: 0.5 },
  // Smog is a grey-brown veil — it is not drawn in the AQHI legend colours
  // (those mean "level", not "what the air looks like").
  haze: { day: '#B7AEA2', night: '#4F4B47' },
  shimmer: '#FFFFFF',
  sparkle: '#EAF6FF',
  shadow: 'rgba(0,0,0,0.2)',
  person: {
    skin: '#F2C199',
    hair: '#3E2A20',
    shirt: '#2F8F9D',
    shorts: '#34495E',
    shoes: '#2E2E3A',
    ink: '#263238',
    blush: '#F0736B',
    sweat: '#7CCBF5',
    fan: '#FFD166',
    fanRibs: '#D9A93A',
    mask: '#E8ECEF',
    maskLine: '#C7CDD1',
    // Darker than the smog so the puff still shows inside the haze.
    cough: 'rgba(96,90,86,0.9)',
  },
  dog: {
    fur: '#D29054',
    furDark: '#A9682F',
    muzzle: '#F5E3D0',
    ink: '#2F2016',
    tongue: '#E8748C',
    collar: '#E05A47',
    drool: 'rgba(214,240,255,0.95)',
    droolEdge: 'rgba(120,170,205,0.7)',
    puddle: 'rgba(196,228,248,0.75)',
  },
};
