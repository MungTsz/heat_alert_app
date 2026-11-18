// src/utils/sceneEntrance.ts
// The walk-in's timing maths, as pure worklets (they run on the UI thread
// inside Reanimated derived values, and are unit-tested here).
import { SCENE_ENTRANCE } from '../config/sceneConfig';

// How far the walk has got, 0 → 1: an even strolling pace, then slowing
// smoothly to a stop over the last (1 - cruiseShare) of the time — never a
// rush at the start.
export const walkProgress = (elapsedMs: number): number => {
  'worklet';
  const k = Math.min(1, Math.max(0, elapsedMs / SCENE_ENTRANCE.walkMs));
  const k0 = SCENE_ENTRANCE.cruiseShare;
  const speed = 1 / (1 - (1 - k0) / 2); // so the walk ends exactly at 1
  if (k <= k0) return speed * k;
  const d = k - k0;
  return speed * (k0 + d - (d * d) / (2 * (1 - k0)));
};

// 0 while walking, rising to 1 over reactMs once they've arrived.
export const reactProgress = (elapsedMs: number): number => {
  'worklet';
  return Math.min(1, Math.max(0, (elapsedMs - SCENE_ENTRANCE.walkMs) / SCENE_ENTRANCE.reactMs));
};

// 1 while walking, 0 once arrived.
export const walking = (elapsedMs: number): number => {
  'worklet';
  return elapsedMs < SCENE_ENTRANCE.walkMs ? 1 : 0;
};
