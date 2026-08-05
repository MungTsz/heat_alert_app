// src/components/scene/HeatScene.tsx
import React from 'react';
import {
  Canvas,
  Rect,
  LinearGradient,
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
import CharacterLayer from './CharacterLayer';
import ThermometerLayer from './ThermometerLayer';
import { computeSceneLayout } from '../../utils/sceneLayout';

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
  const blurAmount = useDerivedValue(() => {
    if (!scrollY) return 0;
    return interpolate(
      scrollY.value ?? 0,
      [0, 150],
      [0, 10],
      Extrapolation.CLAMP,
    );
  });

  const layout = computeSceneLayout(width, height);

  return (
    <Canvas style={{ flex: 1 }}>
      {/* Background: orange -> yellow (halfway point) -> white (bottom half) */}
      <Rect x={0} y={0} width={width} height={height}>
        <LinearGradient
          start={vec(0, 0)}
          end={vec(0, height)}
          colors={['#FF7A00', '#FFD23F', '#FFFFFF']}
          positions={[0, 0.5, 1]}
        />
      </Rect>

      <Group>
        <Blur blur={blurAmount} />

        <ThermometerLayer
          x={layout.thermometerX}
          topY={layout.topY}
          bottomY={layout.bottomY}
          temperatureCelsius={temperatureCelsius}
        />

        {/* Unchanged — same component, same props */}
        <CharacterLayer
          width={width}
          height={height}
          horizonY={layout.horizonY}
        />
      </Group>
    </Canvas>
  );
};

export default HeatScene;
