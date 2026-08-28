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

const MAX_PARTICLES = 8; // fixed count — always rendered, never conditional

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
  const intensity = Math.max(0, Math.min(1, (aqhi - 4) / 7)); // was (aqhi - 1) / 10
  const baseOpacity = 0.14 + intensity * 0.34;
  const blurAmount = 10 + intensity * 14;
  // How many of the MAX_PARTICLES slots are actually "active" at this severity
  const activeCount = 4 + Math.round(intensity * 4);

  // Every slot's hook is always called — inactive slots just render at
  // opacity 0, keeping hook count constant regardless of aqhi.
  const p0 = useHazeParticle(
    0,
    width,
    height,
    driftProgress,
    0 < activeCount ? baseOpacity : 0,
  );
  const p1 = useHazeParticle(
    1,
    width,
    height,
    driftProgress,
    1 < activeCount ? baseOpacity : 0,
  );
  const p2 = useHazeParticle(
    2,
    width,
    height,
    driftProgress,
    2 < activeCount ? baseOpacity : 0,
  );
  const p3 = useHazeParticle(
    3,
    width,
    height,
    driftProgress,
    3 < activeCount ? baseOpacity : 0,
  );
  const p4 = useHazeParticle(
    4,
    width,
    height,
    driftProgress,
    4 < activeCount ? baseOpacity : 0,
  );
  const p5 = useHazeParticle(
    5,
    width,
    height,
    driftProgress,
    5 < activeCount ? baseOpacity : 0,
  );
  const p6 = useHazeParticle(
    6,
    width,
    height,
    driftProgress,
    6 < activeCount ? baseOpacity : 0,
  );
  const p7 = useHazeParticle(
    7,
    width,
    height,
    driftProgress,
    7 < activeCount ? baseOpacity : 0,
  );

  const particles = [p0, p1, p2, p3, p4, p5, p6, p7];

  return (
    <Group>
      <Blur blur={blurAmount} />
      {particles.map((p, i) => (
        <Circle
          key={`haze-${i}`}
          cx={p.cx}
          cy={p.cy}
          r={p.r}
          color={aqhiColor}
          opacity={p.opacity}
        />
      ))}
    </Group>
  );
};

// A single particle's animated x position — one hook, always called the
// same number of times per render regardless of severity.
function useHazeParticle(
  index: number,
  width: number,
  height: number,
  driftProgress: ReturnType<typeof useSharedValue<number>>,
  opacity: number,
) {
  const baseCx = (width / MAX_PARTICLES) * index + width * 0.06;
  const baseCy = height * (0.12 + (index % 3) * 0.08);
  const r = 46 + (index % 3) * 18;
  const speedFactor = 0.6 + (index % 3) * 0.25;

  const cx = useDerivedValue(() => {
    const travel = driftProgress.value * speedFactor * (width * 1.4);
    return ((baseCx + travel) % (width * 1.4)) - width * 0.2;
  }, [driftProgress]);

  return { cx, cy: baseCy, r, opacity };
}

export default AqhiHazeLayer;
