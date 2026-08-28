// src/components/scene/CleanAirSparkleLayer.tsx
import React, { useEffect } from 'react';
import { Group, Circle } from '@shopify/react-native-skia';
import {
  useSharedValue,
  useDerivedValue,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';

type Props = { width: number; height: number };

const SPARKLE_COUNT = 6;

const CleanAirSparkleLayer: React.FC<Props> = ({ width, height }) => {
  const rise = useSharedValue(0);

  useEffect(() => {
    rise.value = withRepeat(
      withTiming(1, { duration: 4200, easing: Easing.linear }),
      -1,
      false,
    );
  }, []);

  const s0 = useSparkle(0, width, height, rise);
  const s1 = useSparkle(1, width, height, rise);
  const s2 = useSparkle(2, width, height, rise);
  const s3 = useSparkle(3, width, height, rise);
  const s4 = useSparkle(4, width, height, rise);
  const s5 = useSparkle(5, width, height, rise);
  const sparkles = [s0, s1, s2, s3, s4, s5];

  return (
    <Group>
      {sparkles.map((s, i) => (
        <Circle
          key={`sparkle-${i}`}
          cx={s.cx}
          cy={s.cy}
          r={2.5}
          color="#EAF6FF"
          opacity={s.opacity}
        />
      ))}
    </Group>
  );
};

function useSparkle(
  index: number,
  width: number,
  height: number,
  rise: ReturnType<typeof useSharedValue<number>>,
) {
  const baseX = (width / SPARKLE_COUNT) * index + width * 0.08;
  const startY = height * (0.15 + (index % 3) * 0.1);
  const phaseOffset = index / SPARKLE_COUNT;

  const cx = useDerivedValue(() => {
    const t = (rise.value + phaseOffset) % 1;
    return baseX + Math.sin(t * Math.PI * 2) * 8;
  }, [rise]);

  const cy = useDerivedValue(() => {
    const t = (rise.value + phaseOffset) % 1;
    return startY - t * 60;
  }, [rise]);

  const opacity = useDerivedValue(() => {
    const t = (rise.value + phaseOffset) % 1;
    if (t < 0.15) return t / 0.15;
    if (t > 0.75) return (1 - t) / 0.25;
    return 1;
  }, [rise]);

  return { cx, cy, opacity };
}

export default CleanAirSparkleLayer;
