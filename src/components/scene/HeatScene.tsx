// src/components/scene/HeatScene.tsx
import React from 'react';
import { StyleSheet } from 'react-native';
import { Blur, Canvas, Group } from '@shopify/react-native-skia';
import {
  Extrapolation,
  SharedValue,
  interpolate,
  useDerivedValue,
} from 'react-native-reanimated';
import SceneBackdrop from './SceneBackdrop';
import AqhiHazeLayer from './AqhiHazeLayer';
import CleanAirSparkleLayer from './CleanAirSparkleLayer';
import HeatShimmerLayer from './HeatShimmerLayer';
import DogCharacter from './DogCharacter';
import PersonCharacter from './PersonCharacter';
import { computeSceneLayout } from '../../utils/sceneLayout';
import { sceneMoodFor } from '../../utils/sceneMood';
import { SCENE_LAYOUT } from '../../config/sceneConfig';

type Props = {
  width: number;
  height: number;
  // null = not loaded yet / unavailable: the scene then shows no reaction
  // to that hazard (see sceneMoodFor) instead of guessing one.
  heatIndexC: number | null;
  aqhi: number | null;
  scrollY?: SharedValue<number>;
  // Phone hour for day / night; only the dev scene preview passes it.
  hour?: number;
};

// Home's mood picture, back to front: the harbour view (sky, sun, hills,
// towers, water, lawn), the air (haze or clean-air glints), heat shimmer
// over the ground, then the dog and the person. What each element does at
// each level is decided by sceneMoodFor; this file only stacks the layers.
const HeatScene: React.FC<Props> = ({ width, height, heatIndexC, aqhi, scrollY, hour }) => {
  // The characters soften as the cards scroll up over them.
  const blurAmount = useDerivedValue(() => {
    if (!scrollY) return 0;
    return interpolate(scrollY.value ?? 0, [0, 150], [0, 10], Extrapolation.CLAMP);
  });

  const layout = computeSceneLayout(width, height);
  const mood = sceneMoodFor({ heatIndexC, aqhi, hour: hour ?? new Date().getHours() });
  const env = mood.environment;

  return (
    <Canvas style={styles.canvas}>
      <SceneBackdrop width={width} height={height} layout={layout} mood={env} />

      <AqhiHazeLayer
        width={width}
        horizonY={layout.horizonY}
        groundY={layout.groundY}
        intensity={env.haze}
        isNight={env.isNight}
      />
      {env.sparkles && <CleanAirSparkleLayer width={width} horizonY={layout.horizonY} />}
      <HeatShimmerLayer width={width} groundY={layout.groundY} intensity={env.shimmer} />

      <Group>
        <Blur blur={blurAmount} />
        <DogCharacter
          x={layout.dogX}
          groundY={layout.groundY}
          scale={SCENE_LAYOUT.characterScale}
          mood={mood.dog}
        />
        <PersonCharacter
          x={layout.personX}
          groundY={layout.groundY}
          scale={SCENE_LAYOUT.characterScale}
          mood={mood.person}
        />
      </Group>
    </Canvas>
  );
};

const styles = StyleSheet.create({ canvas: { flex: 1 } });

export default HeatScene;
