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
import { getHeatIndexInfo } from '../../utils/heatIndexUtils';

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

  // The ONLY source of background color — no other constant/hardcoded
  // orange/yellow value exists anywhere in this file.
  const { color: levelColor } = getHeatIndexInfo(temperatureCelsius);

  return (
    <Canvas style={{ flex: 1 }}>
      {/* Single heat-level color, solid for the top half, fading to pure white
          by the vertical midpoint. Exactly two colors: levelColor and #FFFFFF. */}
      <Rect x={0} y={0} width={width} height={height}>
        <LinearGradient
          start={vec(0, 0)}
          end={vec(0, height)}
          colors={[levelColor, '#FFFFFF']}
          positions={[0, 1]}
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
