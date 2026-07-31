// src/components/scene/HeatScene.tsx
import React from 'react';
import {
  Canvas,
  LinearGradient,
  Rect,
  vec,
  Group,
  Blur,
} from '@shopify/react-native-skia';
import {
  SharedValue,
  useDerivedValue,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import SkyLayer from './SkyLayer';
import LawnLayer from './LawnLayer';
import CharacterLayer from './CharacterLayer';

type Props = {
  width: number;
  height: number;
  temperatureCelsius: number;
  scrollY?: SharedValue<number>;
};

const HeatScene: React.FC<Props> = ({
  width,
  height,
  temperatureCelsius,
  scrollY,
}) => {
  // Safe blur derivation to prevent Skia canvas from crashing
  const blurAmount = useDerivedValue(() => {
    if (!scrollY) return 0;
    return interpolate(
      scrollY.value ?? 0,
      [0, 150],
      [0, 10],
      Extrapolation.CLAMP,
    );
  });

  // Extreme Heat Colors
  const topColor = '#E65100'; // Deep Amber / Burning Orange
  const bottomColor = '#FFB300'; // Blazing Yellow
  const sunColor = '#FF3D00'; // Fire Red Sun Core
  const lawnColor = '#C0CA33'; // Warm Sunbaked Grass
  const horizonY = height * 0.42;

  return (
    <Canvas style={{ flex: 1 }}>
      <Group>
        <Blur blur={blurAmount} />

        {/* 1. Sky & Sunbeams */}
        <SkyLayer
          width={width}
          horizonY={horizonY}
          topColor={topColor}
          bottomColor={bottomColor}
          sunColor={sunColor}
        />

        {/* 2. Ground */}
        <LawnLayer
          width={width}
          height={height}
          horizonY={horizonY}
          color={lawnColor}
        />

        {/* 3. Gradient Fade into bottom UI */}
        <Rect x={0} y={horizonY + 80} width={width} height={height - horizonY}>
          <LinearGradient
            start={vec(0, horizonY + 80)}
            end={vec(0, height)}
            colors={['rgba(245,245,245,0)', '#F5F5F5']}
          />
        </Rect>

        {/* 4. Character, Dog & Heat Waves */}
        <CharacterLayer width={width} height={height} horizonY={horizonY} />
      </Group>
    </Canvas>
  );
};

export default HeatScene;
