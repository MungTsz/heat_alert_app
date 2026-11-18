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
// far you can see (haze over the hills and towers), the person's
// cough / mask and the dog's listlessness and fast breathing.
//
// Both tables are indexed by the hazard's own level 1-5 (hazardLevelOf:
// heat No Caution … Extreme Danger, AQHI Low … Serious), so the scene can
// never classify a reading differently from the cards and the alerts.

export type SceneMouth = 'smile' | 'neutral' | 'pant' | 'frown';
export type SceneEyes = 'open' | 'tired' | 'squint';
export type DogPose = 'sit' | 'lie';
export type DogTongue = 'none' | 'short' | 'long';
// 'pant' = mouth open, jaw working with every breath.
export type DogMouth = 'smile' | 'closed' | 'pant';
export type DogEyes = 'open' | 'tired' | 'closed';

// What both hazards can do to the dog; sceneMoodFor merges the two (the
// worse of each).
export type DogReaction = {
  pose: DogPose;
  tongue: DogTongue;
  mouth: DogMouth;
  eyes: DogEyes;
  tailWagMs: number | null; // one wag; null = tail still
  pantMs: number | null; // one breath in + out; null = calm breathing
  heavyBreath: boolean; // big visible huffs at the mouth
};

export type HeatSceneLevel = {
  person: {
    mouth: SceneMouth;
    eyes: SceneEyes;
    sadBrows: boolean;
    sweatDrops: number; // ≤ SCENE_LIMITS.maxSweatDrops
    flush: number; // cheek blush opacity, 0-1
    fanning: boolean;
  };
  // Dogs don't sweat — they cool off by panting hard with the tongue out,
  // drooling and lying flat on the coolest ground they can find.
  dog: DogReaction & {
    droolDrops: number; // ≤ SCENE_LIMITS.maxDroolDrops
    puddle: number; // drool puddle size, 0-1
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
  // Dogs breathing dirty air: listless (no grin, no wagging), then lying
  // down, breathing fast even at rest.
  dog: DogReaction;
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
    dog: {
      pose: 'sit', tongue: 'none', mouth: 'smile', eyes: 'open',
      tailWagMs: 260, pantMs: null, heavyBreath: false, droolDrops: 0, puddle: 0,
    },
    environment: { sunGlow: 0.25, skyWarmth: 0, shimmer: 0 },
  },
  // Caution — mouth open, light panting.
  2: {
    person: { mouth: 'smile', eyes: 'open', sadBrows: false, sweatDrops: 1, flush: 0, fanning: false },
    dog: {
      pose: 'sit', tongue: 'short', mouth: 'pant', eyes: 'open',
      tailWagMs: 420, pantMs: 560, heavyBreath: false, droolDrops: 0, puddle: 0,
    },
    environment: { sunGlow: 0.45, skyWarmth: 0.15, shimmer: 0 },
  },
  // Extreme Caution — hard panting, tongue hanging out, first drool.
  3: {
    person: { mouth: 'neutral', eyes: 'open', sadBrows: false, sweatDrops: 2, flush: 0.35, fanning: true },
    dog: {
      pose: 'sit', tongue: 'long', mouth: 'pant', eyes: 'open',
      tailWagMs: 700, pantMs: 380, heavyBreath: true, droolDrops: 1, puddle: 0,
    },
    environment: { sunGlow: 0.65, skyWarmth: 0.35, shimmer: 0.4 },
  },
  // Danger — the dog gives up and lies flat, still panting hard.
  4: {
    person: { mouth: 'pant', eyes: 'tired', sadBrows: false, sweatDrops: 3, flush: 0.6, fanning: true },
    dog: {
      pose: 'lie', tongue: 'long', mouth: 'pant', eyes: 'tired',
      tailWagMs: null, pantMs: 300, heavyBreath: true, droolDrops: 2, puddle: 0.6,
    },
    environment: { sunGlow: 0.85, skyWarmth: 0.6, shimmer: 0.75 },
  },
  // Extreme Danger
  5: {
    person: { mouth: 'frown', eyes: 'squint', sadBrows: true, sweatDrops: 4, flush: 0.85, fanning: true },
    dog: {
      pose: 'lie', tongue: 'long', mouth: 'pant', eyes: 'closed',
      tailWagMs: null, pantMs: 240, heavyBreath: true, droolDrops: 3, puddle: 1,
    },
    environment: { sunGlow: 1, skyWarmth: 0.85, shimmer: 1 },
  },
};

// A dog that is fine with the air — the heat table decides everything.
const AIR_DOG_FINE = {
  pose: 'sit', tongue: 'none', mouth: 'smile', eyes: 'open',
  tailWagMs: 260, pantMs: null, heavyBreath: false,
} as const;

// AQHI level 1-5 → reactions. Thresholds come from aqhiUtils.ts.
export const SCENE_AIR_LEVELS: Record<1 | 2 | 3 | 4 | 5, AirSceneLevel> = {
  // Low
  1: {
    person: { mouth: 'smile', eyes: 'open', sadBrows: false, cough: false, mask: false },
    dog: AIR_DOG_FINE,
    environment: { haze: 0, sparkles: true },
  },
  // Moderate — no grin, wagging less.
  2: {
    person: { mouth: 'neutral', eyes: 'open', sadBrows: false, cough: false, mask: false },
    dog: { ...AIR_DOG_FINE, mouth: 'closed', tailWagMs: 600 },
    environment: { haze: 0.3, sparkles: false },
  },
  // High — listless: no interest in playing, tail still, heavy eyelids.
  3: {
    person: { mouth: 'neutral', eyes: 'open', sadBrows: false, cough: true, mask: false },
    dog: { ...AIR_DOG_FINE, mouth: 'closed', eyes: 'tired', tailWagMs: null },
    environment: { haze: 0.55, sparkles: false },
  },
  // Very High — won't walk or play: lies down, breathing fast even at rest.
  4: {
    person: { mouth: 'frown', eyes: 'tired', sadBrows: true, cough: false, mask: true },
    dog: {
      ...AIR_DOG_FINE, pose: 'lie', tongue: 'short', mouth: 'pant', eyes: 'tired',
      tailWagMs: null, pantMs: 380,
    },
    environment: { haze: 0.78, sparkles: false },
  },
  // Serious — heavy, laboured breathing on top.
  5: {
    person: { mouth: 'frown', eyes: 'squint', sadBrows: true, cough: false, mask: true },
    dog: {
      ...AIR_DOG_FINE, pose: 'lie', tongue: 'short', mouth: 'pant', eyes: 'tired',
      tailWagMs: null, pantMs: 300, heavyBreath: true,
    },
    environment: { haze: 0.95, sparkles: false },
  },
};

// Home opens (and reopens, on coming back to the tab) with the person and
// the dog strolling in from the left together. They already show how the
// weather is treating them as they walk (sweating, fanning, panting) — no
// stand-in expression that changes on arrival; the only change is the dog
// sitting or lying down once it gets there. Skipped under Reduce Motion
// (they're simply there).
export const SCENE_ENTRANCE = {
  walkMs: 3000, // from off-screen to their spots, at a stroll
  // Share of the walk at an even pace; they slow to a stop over the rest.
  cruiseShare: 0.75,
  reactMs: 350, // the dog settling into its pose
  startMarginPx: 60, // how far past the left edge they start
  personStepMs: 760, // one full stride (left + right foot)
  dogStepMs: 440,
  personLegLiftPx: 4,
  personArmSwing: 0.3, // radians each way
  dogLegSwing: 0.45, // radians each way
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
  characterScale: 1.15,
  // The sun on the left by day, the moon across the sky on the right at
  // night (kept clear of the side bar, which opens over the right edge).
  sunXFraction: 0.2,
  moonXFraction: 0.7,
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

// The dev-only scene preview (ScenePreviewScreen).
export const SCENE_PREVIEW_CONFIG = {
  // "Play" steps to the next situation this often.
  cycleMs: 3000,
  // Space kept below the characters in the preview's scene box.
  sceneBottomPadding: 16,
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
    skinShade: '#E2A97E', // ears, neck shadow, nose
    hair: '#3B2A22',
    hairShine: '#5A4236',
    shirt: '#2F8F9D',
    shirtShade: '#287A86', // sleeves and collar
    shorts: '#34495E',
    shoes: '#2E2E3A',
    soles: '#F4F4F4',
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
    mouthInside: '#5A2E2E',
    tongueCrease: 'rgba(150,40,60,0.45)',
    highlight: 'rgba(255,255,255,0.85)',
    breath:'rgba(255,255,255,0.95)', // huff marks at the mouth
    breathEdge: 'rgba(60,80,100,0.35)',
    drool: 'rgba(214,240,255,0.95)',
    droolEdge: 'rgba(120,170,205,0.7)',
    puddle: 'rgba(196,228,248,0.75)',
  },
};
