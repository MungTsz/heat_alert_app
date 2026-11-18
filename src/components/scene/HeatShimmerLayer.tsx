// src/components/scene/HeatShimmerLayer.tsx
import React from 'react';
import { Group, Path } from '@shopify/react-native-skia';
import { SharedValue, useDerivedValue } from 'react-native-reanimated';
import { SCENE_LIMITS, SCENE_PALETTE, SCENE_TIMING } from '../../config/sceneConfig';
import { useSceneLoop } from './useSceneLoop';

type Props = {
  width: number;
  groundY: number;
  intensity: number; // 0-1; 0 draws nothing
};

// Wavy lines rising off the sun-baked ground — the "air is wobbling" look
// of a very hot day. More visible the hotter it is.
const LINE_HALF = 22;
const WAVE = 3;
const RISE_PX = 70;
// Spread across the scene, staggered so they don't rise in step.
const LINE_X = [0.1, 0.3, 0.48, 0.68, 0.86];

const wavyLine = (() => {
  const step = LINE_HALF / 2;
  let d = `M ${-LINE_HALF} 0`;
  for (let i = 0; i < 4; i++) {
    const x0 = -LINE_HALF + i * step;
    d += ` Q ${x0 + step / 2} ${i % 2 === 0 ? -WAVE : WAVE} ${x0 + step} 0`;
  }
  return d;
})();

const ShimmerLine: React.FC<{
  index: number;
  x: number;
  groundY: number;
  intensity: number;
  loop: SharedValue<number>;
}> = ({ index, x, groundY, intensity, loop }) => {
  const phase = index / SCENE_LIMITS.shimmerLines;
  const transform = useDerivedValue(() => {
    const p = (loop.value + phase) % 1;
    return [
      { translateX: x + Math.sin(p * Math.PI * 2) * 4 },
      { translateY: groundY - 6 - p * RISE_PX },
    ];
  });
  // Fades in off the ground and out as it rises.
  const opacity = useDerivedValue(() => {
    const p = (loop.value + phase) % 1;
    return Math.sin(p * Math.PI) * 0.55 * intensity;
  });
  return (
    <Group transform={transform} opacity={opacity}>
      <Path
        path={wavyLine}
        color={SCENE_PALETTE.shimmer}
        style="stroke"
        strokeWidth={1.8}
        strokeCap="round"
      />
    </Group>
  );
};

const HeatShimmerLayer: React.FC<Props> = ({ width, groundY, intensity }) => {
  const loop = useSceneLoop(SCENE_TIMING.shimmerMs);
  if (intensity <= 0) return null;
  return (
    <Group>
      {LINE_X.slice(0, SCENE_LIMITS.shimmerLines).map((fx, i) => (
        <ShimmerLine
          key={`shimmer-${i}`}
          index={i}
          x={fx * width}
          groundY={groundY}
          intensity={intensity}
          loop={loop}
        />
      ))}
    </Group>
  );
};

export default HeatShimmerLayer;
