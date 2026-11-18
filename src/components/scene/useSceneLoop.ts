// src/components/scene/useSceneLoop.ts
import { useEffect } from 'react';
import {
  Easing,
  SharedValue,
  cancelAnimation,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { SCENE_ENTRANCE, SCENE_TIMING } from '../../config/sceneConfig';

// The entrance clock: ms since the scene appeared, counting up once to
// walkMs + reactMs and then holding there. Under Reduce Motion it starts at
// the end — the characters are simply in place, already reacting.
export const useSceneEntrance = (): SharedValue<number> => {
  const reduceMotion = useReducedMotion();
  const total = SCENE_ENTRANCE.walkMs + SCENE_ENTRANCE.reactMs;
  const elapsed = useSharedValue(reduceMotion ? total : 0);

  useEffect(() => {
    if (reduceMotion) {
      cancelAnimation(elapsed);
      elapsed.value = total;
      return;
    }
    elapsed.value = withTiming(total, { duration: total, easing: Easing.linear });
    return () => cancelAnimation(elapsed);
    // Runs once per mount: the walk-in plays when the scene first appears,
    // not every time a reading changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduceMotion]);

  return elapsed;
};


// One endlessly repeating 0→1 progress value, the clock behind every scene
// animation. `reverse` runs it back and forth (breathing, wagging) instead
// of restarting (falling drops). A null duration holds it still. With the
// system's Reduce Motion setting on it holds still on a mid-cycle frame, so
// drops and puffs stay visible instead of fading out.
export const useSceneLoop = (
  durationMs: number | null,
  { reverse = false }: { reverse?: boolean } = {},
): SharedValue<number> => {
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(0);

  useEffect(() => {
    if (durationMs === null || reduceMotion) {
      cancelAnimation(progress);
      progress.value = SCENE_TIMING.reducedMotionFrame;
      return;
    }
    progress.value = 0;
    progress.value = withRepeat(
      withTiming(1, {
        duration: durationMs,
        easing: reverse ? Easing.inOut(Easing.sin) : Easing.linear,
      }),
      -1,
      reverse,
    );
    return () => cancelAnimation(progress);
  }, [durationMs, reduceMotion, reverse, progress]);

  return progress;
};
