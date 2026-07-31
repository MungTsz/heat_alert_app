// src/components/scene/CharacterLayer.tsx
import React, { useEffect } from 'react';
import {
  Group,
  Circle,
  Path,
  RoundedRect,
  Oval,
} from '@shopify/react-native-skia';
import {
  useSharedValue,
  useDerivedValue,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';

type Props = {
  width: number;
  height: number;
  horizonY: number;
};

const CharacterLayer: React.FC<Props> = ({ width, height, horizonY }) => {
  const bobProgress = useSharedValue(0);
  const sweatAProgress = useSharedValue(0);
  const sweatBProgress = useSharedValue(0);
  const heatWaveProgress = useSharedValue(0);

  useEffect(() => {
    bobProgress.value = withRepeat(
      withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );

    sweatAProgress.value = withRepeat(
      withTiming(1, { duration: 800, easing: Easing.linear }),
      -1,
      false,
    );

    sweatBProgress.value = withRepeat(
      withTiming(1, { duration: 1100, easing: Easing.linear }),
      -1,
      false,
    );

    heatWaveProgress.value = withRepeat(
      withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
  }, []);

  const bobTransform = useDerivedValue(() => [
    { translateY: bobProgress.value * -5 },
  ]);

  const waveTransform = useDerivedValue(() => [
    { translateY: heatWaveProgress.value * -4 },
  ]);

  const sweatOpacityA = useDerivedValue(() => sweatAProgress.value);
  const sweatOpacityB = useDerivedValue(() => sweatBProgress.value);

  const groundY = horizonY + 15;
  const centerX = width * 0.72;
  const headR = 22;
  const bodyW = 30;
  const bodyH = 46;
  const headCy = groundY - bodyH - headR;
  const bodyY = groundY - bodyH;

  const petCx = centerX - 48;
  const petCy = groundY + 4;

  return (
    <Group>
      {/* Ground Shadows */}
      <Oval
        rect={{ x: centerX - 22, y: groundY + 12, width: 44, height: 8 }}
        color="rgba(0,0,0,0.22)"
      />
      <Oval
        rect={{ x: petCx - 18, y: groundY + 12, width: 36, height: 7 }}
        color="rgba(0,0,0,0.22)"
      />

      {/* --- PERSON --- */}
      <Group transform={bobTransform}>
        {/* Body */}
        <RoundedRect
          x={centerX - bodyW / 2}
          y={bodyY}
          width={bodyW}
          height={bodyH}
          r={14}
          color="#37474F"
        />

        {/* Head */}
        <Circle cx={centerX} cy={headCy} r={headR} color="#F2C199" />

        {/* Sun-Flushed Red Face */}
        <Circle
          cx={centerX}
          cy={headCy + 2}
          r={14}
          color="#FF5252"
          opacity={0.35}
        />

        {/* Face Features */}
        <Circle cx={centerX - 7} cy={headCy - 2} r={2.2} color="#263238" />
        <Circle cx={centerX + 7} cy={headCy - 2} r={2.2} color="#263238" />
        <Path
          path={`M ${centerX - 6} ${headCy + 10} Q ${centerX} ${headCy + 5} ${
            centerX + 6
          } ${headCy + 10}`}
          color="#263238"
          style="stroke"
          strokeWidth={2.2}
        />

        {/* Arms */}
        <Path
          path={`M ${centerX - bodyW / 2} ${bodyY + 10} L ${
            centerX - bodyW / 2 - 12
          } ${bodyY + 26}`}
          color="#F2C199"
          style="stroke"
          strokeWidth={7}
          strokeCap="round"
        />
        <Path
          path={`M ${centerX + bodyW / 2} ${bodyY + 10} L ${
            centerX + bodyW / 2 + 12
          } ${bodyY + 26}`}
          color="#F2C199"
          style="stroke"
          strokeWidth={7}
          strokeCap="round"
        />

        {/* Legs */}
        <Path
          path={`M ${centerX - 8} ${groundY - 2} L ${centerX - 10} ${
            groundY + 14
          }`}
          color="#E91E63"
          style="stroke"
          strokeWidth={8}
          strokeCap="round"
        />
        <Path
          path={`M ${centerX + 8} ${groundY - 2} L ${centerX + 10} ${
            groundY + 14
          }`}
          color="#E91E63"
          style="stroke"
          strokeWidth={8}
          strokeCap="round"
        />

        {/* --- RISING HEAT WAVES ABOVE HEAD --- */}
        <Group transform={waveTransform}>
          <Path
            path={`M ${centerX - 10} ${headCy - headR - 6} Q ${centerX - 16} ${
              headCy - headR - 16
            } ${centerX - 10} ${headCy - headR - 26}`}
            color="#FF3D00"
            style="stroke"
            strokeWidth={2.5}
            strokeCap="round"
            opacity={0.85}
          />
          <Path
            path={`M ${centerX} ${headCy - headR - 8} Q ${centerX + 6} ${
              headCy - headR - 20
            } ${centerX} ${headCy - headR - 32}`}
            color="#FF6D00"
            style="stroke"
            strokeWidth={2.5}
            strokeCap="round"
            opacity={0.9}
          />
          <Path
            path={`M ${centerX + 10} ${headCy - headR - 6} Q ${centerX + 16} ${
              headCy - headR - 16
            } ${centerX + 10} ${headCy - headR - 26}`}
            color="#FF3D00"
            style="stroke"
            strokeWidth={2.5}
            strokeCap="round"
            opacity={0.85}
          />
        </Group>

        {/* Sweat drops */}
        <Path
          path={`M ${centerX - headR - 2} ${headCy - 8} Q ${
            centerX - headR - 6
          } ${headCy + 2} ${centerX - headR - 2} ${headCy + 6} Q ${
            centerX - headR + 2
          } ${headCy + 2} ${centerX - headR - 2} ${headCy - 8}`}
          color="#FFFFFF"
          opacity={sweatOpacityA}
        />
        <Path
          path={`M ${centerX - 12} ${headCy - headR - 2} Q ${centerX - 16} ${
            headCy - headR + 6
          } ${centerX - 12} ${headCy - headR + 10} Q ${centerX - 8} ${
            headCy - headR + 6
          } ${centerX - 12} ${headCy - headR - 2}`}
          color="#FFFFFF"
          opacity={sweatOpacityB}
        />
        <Path
          path={`M ${centerX + headR + 2} ${headCy - 4} Q ${
            centerX + headR - 2
          } ${headCy + 6} ${centerX + headR + 2} ${headCy + 10} Q ${
            centerX + headR + 6
          } ${headCy + 6} ${centerX + headR + 2} ${headCy - 4}`}
          color="#FFFFFF"
          opacity={sweatOpacityB}
        />
      </Group>

      {/* --- DOG --- */}
      <Group>
        <RoundedRect
          x={petCx - 14}
          y={petCy - 16}
          width={28}
          height={20}
          r={9}
          color="#D29054"
        />
        <Circle cx={petCx} cy={petCy - 20} r={11} color="#D29054" />
        <Path
          path={`M ${petCx - 9} ${petCy - 24} Q ${petCx - 17} ${petCy - 18} ${
            petCx - 14
          } ${petCy - 10} Q ${petCx - 8} ${petCy - 16} ${petCx - 9} ${
            petCy - 24
          }`}
          color="#B57236"
        />
        <Path
          path={`M ${petCx + 9} ${petCy - 24} Q ${petCx + 17} ${petCy - 18} ${
            petCx + 14
          } ${petCy - 10} Q ${petCx + 8} ${petCy - 16} ${petCx + 9} ${
            petCy - 24
          }`}
          color="#B57236"
        />
        <Oval
          rect={{ x: petCx - 6, y: petCy - 18, width: 12, height: 9 }}
          color="#F5E3D0"
        />
        <Circle cx={petCx} cy={petCy - 17} r={2.2} color="#2F2016" />
        <Circle cx={petCx - 4.5} cy={petCy - 22} r={1.5} color="#2F2016" />
        <Circle cx={petCx + 4.5} cy={petCy - 22} r={1.5} color="#2F2016" />
        <Path
          path={`M ${petCx - 2.5} ${petCy - 12} Q ${petCx} ${petCy - 4} ${
            petCx + 2.5
          } ${petCy - 12} Z`}
          color="#E8748C"
        />
        <Path
          path={`M ${petCx - 12} ${petCy - 4} Q ${petCx - 20} ${petCy - 12} ${
            petCx - 18
          } ${petCy - 18}`}
          color="#B57236"
          style="stroke"
          strokeWidth={4}
          strokeCap="round"
        />

        <Path
          path={`M ${petCx - 14} ${petCy - 26} Q ${petCx - 17} ${petCy - 20} ${
            petCx - 14
          } ${petCy - 17} Q ${petCx - 11} ${petCy - 20} ${petCx - 14} ${
            petCy - 26
          }`}
          color="#FFFFFF"
          opacity={sweatOpacityA}
        />
      </Group>
    </Group>
  );
};

export default CharacterLayer;
