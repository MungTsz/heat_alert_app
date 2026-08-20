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
import AqhiHazeLayer from './AqhiHazeLayer';
import { computeSceneLayout } from '../../utils/sceneLayout';
import { getHeatIndexInfo } from '../../utils/heatIndexUtils';

type Props = {
  width: number;
  height: number;
  temperatureCelsius: number;
  aqhi?: number; // optional so existing call sites without AQHI still compile
  scrollY?: SharedValue<number>;
};

const HeatScene: React.FC<Props> = ({
  width,
  height,
  temperatureCelsius,
  aqhi = 0,
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

  const { color: levelColor } = getHeatIndexInfo(temperatureCelsius);

  return (
    <Canvas style={{ flex: 1 }}>
      <Rect x={0} y={0} width={width} height={height}>
        <LinearGradient
          start={vec(0, 0)}
          end={vec(0, height)}
          colors={[levelColor, '#FFFFFF']}
          positions={[0, 1]}
        />
      </Rect>

      {/* AQHI haze — sits above the sky gradient, below the thermometer/character,
          so it reads as "in the air" rather than on top of the UI elements. */}
      <AqhiHazeLayer width={width} height={height} aqhi={aqhi} />

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
          aqhi={aqhi}
        />
      </Group>
    </Canvas>
  );
};

export default HeatScene;
