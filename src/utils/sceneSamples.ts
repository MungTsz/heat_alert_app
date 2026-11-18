// src/utils/sceneSamples.ts
// SAMPLE readings for the scene preview (ScenePreviewScreen, development
// builds only) — never used by Home or the alert engine. One reading inside
// each hazard level, mildest first, so the preview can step through every
// row of SCENE_HEAT_LEVELS / SCENE_AIR_LEVELS. A test checks each value
// still falls in its level if the level tables change.
import { HazardKind } from '../types/alerts';
import { AQHI_LEVELS_ORDERED, HEAT_LEVELS_ORDERED } from '../types/settings';

export const SCENE_SAMPLE_READINGS: Record<HazardKind, readonly number[]> = {
  heat: [24, 29, 36, 45, 54], // °C heat index: No Caution … Extreme Danger
  aqhi: [2, 5, 7, 9, 11], // AQHI: Low … Serious ("10+")
};

export const SCENE_SAMPLE_LEVEL_NAMES: Record<HazardKind, readonly string[]> = {
  heat: HEAT_LEVELS_ORDERED,
  aqhi: AQHI_LEVELS_ORDERED,
};

// Phone hours the preview uses for its Day / Night switch.
export const SCENE_SAMPLE_HOURS = { day: 13, night: 22 };
