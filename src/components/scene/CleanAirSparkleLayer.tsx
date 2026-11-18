// src/components/scene/CleanAirSparkleLayer.tsx
import React from 'react';
import { Group, Path } from '@shopify/react-native-skia';
import { SharedValue, useDerivedValue } from 'react-native-reanimated';
import { SCENE_LIMITS, SCENE_PALETTE, SCENE_TIMING } from '../../config/sceneConfig';
import { useSceneLoop } from './useSceneLoop';

type Props = { width: number; horizonY: number };

// Small four-point glints drifting up — "the air is fresh" — shown only for
// a Low AQHI reading (never without one).
const GLINT = (() => {
  const r = 3.2;
  const k = 0.9; // waist of the star
  return `M 0 ${-r} Q ${k} ${-k} ${r} 0 Q ${k} ${k} 0 ${r} Q ${-k} ${k} ${-r} 0 Q ${-k} ${-k} 0 ${-r} Z`;
})();

const Sparkle: React.FC<{
  index: number;
  width: number;
  horizonY: number;
  loop: SharedValue<number>;
}> = ({ index, width, horizonY, loop }) => {
  const count = SCENE_LIMITS.sparkles;
  const baseX = (width / count) * index + width * 0.08;
  const startY = horizonY - 30 - (index % 3) * 34;
  const phase = index / count;

  const transform = useDerivedValue(() => {
    const t = (loop.value + phase) % 1;
    return [
      { translateX: baseX + Math.sin(t * Math.PI * 2) * 8 },
      { translateY: startY - t * 60 },
      { scale: 0.7 + Math.sin(t * Math.PI) * 0.5 },
    ];
  });
  const opacity = useDerivedValue(() => {
    const t = (loop.value + phase) % 1;
    if (t < 0.15) return t / 0.15;
    if (t > 0.75) return (1 - t) / 0.25;
    return 1;
  });

  return (
    <Group transform={transform} opacity={opacity}>
      <Path path={GLINT} color={SCENE_PALETTE.sparkle} />
    </Group>
  );
};

const CleanAirSparkleLayer: React.FC<Props> = ({ width, horizonY }) => {
  const loop = useSceneLoop(SCENE_TIMING.sparkleMs);
  return (
    <Group>
      {Array.from({ length: SCENE_LIMITS.sparkles }).map((_, i) => (
        <Sparkle key={`sparkle-${i}`} index={i} width={width} horizonY={horizonY} loop={loop} />
      ))}
    </Group>
  );
};

export default CleanAirSparkleLayer;
