// src/components/scene/AqhiHazeLayer.tsx
import React, { useEffect } from 'react';
import { Group, Circle, Blur } from '@shopify/react-native-skia';
import {
  useSharedValue,
  useDerivedValue,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { getAqhiInfo } from '../../utils/aqhiUtils';

type Props = {
  width: number;
  height: number;
  aqhi: number;
};

// Drifting haze density/opacity/blur all scale with AQHI severity — faint
// gray-green at Low, thick orange-brown at High/Serious. Uses the same
// color as the AQHI card/pin so the scene stays visually consistent with
// the rest of the app.
const AqhiHazeLayer: React.FC<Props> = ({ width, height, aqhi }) => {
  const driftProgress = useSharedValue(0);

  useEffect(() => {
    driftProgress.value = withRepeat(
      withTiming(1, { duration: 14000, easing: Easing.linear }),
      -1,
      false,
    );
  }, []);

  const { color: aqhiColor } = getAqhiInfo(aqhi);

  // Severity -> visual intensity mapping
  const intensity = Math.max(0, Math.min(1, (aqhi - 1) / 10)); // 1-11 scale -> 0-1
  const baseOpacity = 0.06 + intensity * 0.22; // faint at Low, noticeably hazy at Serious
  const blurAmount = 8 + intensity * 10;
  const particleCount = 4 + Math.round(intensity * 4); // more wisps as it gets worse

  const particles = Array.from({ length: particleCount }).map((_, i) => {
    const baseCx = (width / particleCount) * i + width * 0.06;
    const baseCy = height * (0.12 + (i % 3) * 0.08);
    const r = 46 + (i % 3) * 18;
    const speedFactor = 0.6 + (i % 3) * 0.25; // slightly different drift speeds per wisp

    const cx = useDerivedValue(() => {
      // Loops smoothly left-to-right, wraps around past the right edge
      const travel = driftProgress.value * speedFactor * (width * 1.4);
      return ((baseCx + travel) % (width * 1.4)) - width * 0.2;
    }, [driftProgress]);

    return { cx, cy: baseCy, r, key: `haze-${i}` };
  });

  if (intensity < 0.03) return null; // essentially no haze at very Low AQHI

  return (
    <Group>
      <Blur blur={blurAmount} />
      {particles.map(p => (
        <Circle
          key={p.key}
          cx={p.cx}
          cy={p.cy}
          r={p.r}
          color={aqhiColor}
          opacity={baseOpacity}
        />
      ))}
    </Group>
  );
};

export default AqhiHazeLayer;
