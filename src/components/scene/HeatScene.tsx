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
import CleanAirSparkleLayer from './CleanAirSparkleLayer';
import { computeSceneLayout } from '../../utils/sceneLayout';
import { getHeatIndexInfo } from '../../utils/heatIndexUtils';

type Props = {
  width: number;
  height: number;
  // null = not loaded yet / unavailable: the scene then shows no reading
  // (empty thermometer, no haze or sparkles, neutral face) instead of
  // guessing one.
  temperatureCelsius: number | null;
  aqhi: number | null;
  scrollY?: SharedValue<number>;
};

const getSkyColors = (): [string, string] => {
  const hour = new Date().getHours();
  const isDaytime = hour >= 6 && hour < 18;
  return isDaytime ? ['#8FC1E8', '#FFFFFF'] : ['#1E3A5F', '#5D7A96'];
};

const HeatScene: React.FC<Props> = ({
  width,
  height,
  temperatureCelsius,
  aqhi,
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
  const [skyTop, skyBottom] = getSkyColors();

  const heatSevere =
    temperatureCelsius !== null &&
    ['Danger', 'Extreme Danger'].includes(
      getHeatIndexInfo(temperatureCelsius).classification,
    );

  return (
    <Canvas style={{ flex: 1 }}>
      <Rect x={0} y={0} width={width} height={height}>
        <LinearGradient
          start={vec(0, 0)}
          end={vec(0, height)}
          colors={[skyTop, skyBottom]}
          positions={[0, 1]}
        />
      </Rect>

      {/* Neither layer without a reading — sparkles would claim clean air. */}
      {aqhi === null ? null : aqhi > 4 ? (
        <AqhiHazeLayer width={width} height={height} aqhi={aqhi} />
      ) : (
        <CleanAirSparkleLayer width={width} height={height} />
      )}

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
          centerX={layout.characterCenterX}
          petCx={layout.petCx}
          aqhi={aqhi}
          heatSevere={heatSevere}
        />
      </Group>
    </Canvas>
  );
};

export default HeatScene;
