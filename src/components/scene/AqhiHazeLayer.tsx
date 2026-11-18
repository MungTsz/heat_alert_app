// src/components/scene/AqhiHazeLayer.tsx
import React from 'react';
import { Blur, Group, LinearGradient, Oval, Rect, vec } from '@shopify/react-native-skia';
import { SharedValue, useDerivedValue } from 'react-native-reanimated';
import { SCENE_LIMITS, SCENE_PALETTE, SCENE_TIMING } from '../../config/sceneConfig';
import { withAlpha } from '../../utils/sceneColors';
import { useSceneLoop } from './useSceneLoop';

type Props = {
  width: number;
  horizonY: number;
  groundY: number;
  intensity: number; // 0-1 from the AQHI level; 0 draws nothing
  isNight: boolean;
};

// Smog in front of the skyline: an even grey-brown veil, thickest along
// the horizon, with slow soft banks drifting through it. It sits behind
// the characters, who are close enough to stay sharp. The backdrop already
// fades the hills and towers by distance (SceneBackdrop); this adds the
// air itself.
const BANKS = [
  { above: 30, h: 44, speed: 1 },
  { above: 78, h: 36, speed: 0.7 },
  { above: 8, h: 30, speed: 1.3 },
];

const HazeBank: React.FC<{
  index: number;
  width: number;
  y: number;
  h: number;
  speed: number;
  color: string;
  loop: SharedValue<number>;
}> = ({ index, width, y, h, speed, color, loop }) => {
  const bankW = width * 1.3;
  const transform = useDerivedValue(() => {
    // Wraps across a span wider than the screen, so a bank leaves on one
    // side before it reappears on the other.
    const span = width + bankW;
    const p = (loop.value * speed + index / BANKS.length) % 1;
    return [{ translateX: p * span - bankW }];
  });
  return (
    <Group transform={transform}>
      <Oval rect={{ x: 0, y: y - h / 2, width: bankW, height: h }} color={color} />
    </Group>
  );
};

const AqhiHazeLayer: React.FC<Props> = ({ width, horizonY, groundY, intensity, isNight }) => {
  const loop = useSceneLoop(SCENE_TIMING.hazeDriftMs);
  if (intensity <= 0) return null;
  const base = SCENE_PALETTE.haze[isNight ? 'night' : 'day'];
  const veilBottom = groundY + 30;

  return (
    <Group>
      <Rect x={0} y={0} width={width} height={veilBottom}>
        <LinearGradient
          start={vec(0, 0)}
          end={vec(0, veilBottom)}
          colors={[
            withAlpha(base, intensity * 0.18),
            withAlpha(base, intensity * 0.5),
            withAlpha(base, 0),
          ]}
          positions={[0, horizonY / veilBottom, 1]}
        />
      </Rect>
      <Group>
        <Blur blur={16} />
        {BANKS.slice(0, SCENE_LIMITS.hazeBands).map((b, i) => (
          <HazeBank
            key={`bank-${i}`}
            index={i}
            width={width}
            y={horizonY - b.above}
            h={b.h}
            speed={b.speed}
            color={withAlpha(base, intensity * 0.4)}
            loop={loop}
          />
        ))}
      </Group>
    </Group>
  );
};

export default AqhiHazeLayer;
