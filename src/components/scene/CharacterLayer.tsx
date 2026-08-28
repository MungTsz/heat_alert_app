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
import { getAqhiInfo } from '../../utils/aqhiUtils';

type Props = {
  width: number;
  height: number;
  horizonY: number;
  centerX: number;
  petCx: number;
  aqhi?: number;
  heatSevere?: boolean;
};

const MASK_THRESHOLD_AQHI = 5;
const COUGH_THRESHOLD_AQHI = 5;

const CharacterLayer: React.FC<Props> = ({
  width,
  height,
  horizonY,
  centerX,
  petCx,
  aqhi = 0,
  heatSevere = false,
}) => {
  const bobProgress = useSharedValue(0);
  const sweatAProgress = useSharedValue(0);
  const sweatBProgress = useSharedValue(0);
  const sweatCProgress = useSharedValue(0);
  const sweatDProgress = useSharedValue(0);
  const dogSweatProgress = useSharedValue(0);
  const coughProgress = useSharedValue(0);

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
    sweatCProgress.value = withRepeat(
      withTiming(1, { duration: 950, easing: Easing.linear }),
      -1,
      false,
    );
    sweatDProgress.value = withRepeat(
      withTiming(1, { duration: 1250, easing: Easing.linear }),
      -1,
      false,
    );
    dogSweatProgress.value = withRepeat(
      withTiming(1, { duration: 1000, easing: Easing.linear }),
      -1,
      false,
    );
    coughProgress.value = withRepeat(
      withTiming(1, { duration: 950, easing: Easing.out(Easing.quad) }),
      -1,
      false,
    );
  }, []);

  const bobTransform = useDerivedValue(() => [
    { translateY: bobProgress.value * -5 },
  ]);
  const sweatOpacityA = useDerivedValue(() => sweatAProgress.value);
  const sweatOpacityB = useDerivedValue(() => sweatBProgress.value);
  const sweatOpacityC = useDerivedValue(() => sweatCProgress.value);
  const sweatOpacityD = useDerivedValue(() => sweatDProgress.value);
  const dogSweatOpacity = useDerivedValue(() => dogSweatProgress.value);

  const coughOpacity = useDerivedValue(() => {
    const t = coughProgress.value;
    if (t < 0.15) return t / 0.15;
    if (t < 0.6) return 1 - (t - 0.15) / 0.45;
    return 0;
  });
  const coughTransform = useDerivedValue(() => [
    { translateX: coughProgress.value * 10 },
    { translateY: coughProgress.value * -8 },
  ]);

  const groundY = horizonY + 15;
  const headR = 22;
  const bodyW = 30;
  const bodyH = 46;
  const headCy = groundY - bodyH - headR;
  const bodyY = groundY - bodyH;
  const petCy = groundY + 4;

  const showMask = aqhi >= MASK_THRESHOLD_AQHI;
  const showCough = aqhi >= COUGH_THRESHOLD_AQHI && !showMask;
  const { color: aqhiAccentColor } = getAqhiInfo(aqhi);

  // Combined distress flag — either hazard being severe makes the character
  // unhappy. Masked characters keep a neutral mouth since the mask itself
  // already communicates "this is bad."
  const isDistressed = heatSevere || aqhi >= 7;

  const mouthPath = showMask
    ? null
    : isDistressed
    ? `M ${centerX - 6} ${headCy + 12} Q ${centerX} ${headCy + 6} ${
        centerX + 6
      } ${headCy + 12}` // frown
    : aqhi <= 4
    ? `M ${centerX - 7} ${headCy + 8} Q ${centerX} ${headCy + 15} ${
        centerX + 7
      } ${headCy + 8}` // wide smile — good air
    : `M ${centerX - 6} ${headCy + 10} Q ${centerX} ${headCy + 5} ${
        centerX + 6
      } ${headCy + 10}`; // neutral

  // Sad eyebrows only shown when distressed, to reinforce the frown
  const showSadBrows = isDistressed && !showMask;

  return (
    <Group>
      <Oval
        rect={{ x: centerX - 22, y: groundY + 12, width: 44, height: 8 }}
        color="rgba(0,0,0,0.22)"
      />
      <Oval
        rect={{ x: petCx - 18, y: groundY + 12, width: 36, height: 7 }}
        color="rgba(0,0,0,0.22)"
      />

      <Group transform={bobTransform}>
        <RoundedRect
          x={centerX - bodyW / 2}
          y={bodyY}
          width={bodyW}
          height={bodyH}
          r={14}
          color="#37474F"
        />
        <Circle cx={centerX} cy={headCy} r={headR} color="#F2C199" />

        {/* Hair */}
        <Path
          path={`M ${centerX - headR} ${headCy - 4} Q ${centerX - headR - 2} ${
            headCy - headR - 4
          } ${centerX - headR * 0.4} ${headCy - headR - 6} Q ${centerX} ${
            headCy - headR - 10
          } ${centerX + headR * 0.4} ${headCy - headR - 6} Q ${
            centerX + headR + 2
          } ${headCy - headR - 4} ${centerX + headR} ${
            headCy - 4
          } Q ${centerX} ${headCy - headR - 2} ${centerX - headR} ${
            headCy - 4
          } Z`}
          color="#3E2A20"
        />

        {/* Sad eyebrows — only when distressed and unmasked */}
        {showSadBrows && (
          <>
            <Path
              path={`M ${centerX - 11} ${headCy - 7} L ${centerX - 3} ${
                headCy - 5
              }`}
              color="#263238"
              style="stroke"
              strokeWidth={2}
              strokeCap="round"
            />
            <Path
              path={`M ${centerX + 11} ${headCy - 7} L ${centerX + 3} ${
                headCy - 5
              }`}
              color="#263238"
              style="stroke"
              strokeWidth={2}
              strokeCap="round"
            />
          </>
        )}

        <Circle cx={centerX - 7} cy={headCy - 2} r={2.2} color="#263238" />
        <Circle cx={centerX + 7} cy={headCy - 2} r={2.2} color="#263238" />

        {mouthPath && (
          <Path
            path={mouthPath}
            color="#263238"
            style="stroke"
            strokeWidth={2.2}
          />
        )}

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

        {/* Sweat drops — only meaningful when heat is actually a factor */}
        {heatSevere && (
          <>
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
              path={`M ${centerX - 12} ${headCy - headR - 2} Q ${
                centerX - 16
              } ${headCy - headR + 6} ${centerX - 12} ${
                headCy - headR + 10
              } Q ${centerX - 8} ${headCy - headR + 6} ${centerX - 12} ${
                headCy - headR - 2
              }`}
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
              opacity={sweatOpacityC}
            />
            <Path
              path={`M ${centerX + 10} ${headCy - headR - 4} Q ${
                centerX + 14
              } ${headCy - headR + 4} ${centerX + 10} ${headCy - headR + 8} Q ${
                centerX + 6
              } ${headCy - headR + 4} ${centerX + 10} ${headCy - headR - 4}`}
              color="#FFFFFF"
              opacity={sweatOpacityD}
            />
          </>
        )}

        {showMask && (
          <Group>
            <RoundedRect
              x={centerX - headR * 0.75}
              y={headCy - 1}
              width={headR * 1.5}
              height={headR * 0.95}
              r={headR * 0.4}
              color="#E8ECEF"
            />
            <Path
              path={`M ${centerX - headR * 0.55} ${
                headCy + headR * 0.15
              } Q ${centerX} ${headCy + headR * 0.32} ${
                centerX + headR * 0.55
              } ${headCy + headR * 0.15}`}
              color="#C7CDD1"
              style="stroke"
              strokeWidth={1.2}
            />
            <Path
              path={`M ${centerX - headR * 0.75} ${headCy + 2} L ${
                centerX - headR - 3
              } ${headCy - 8}`}
              color="#C7CDD1"
              style="stroke"
              strokeWidth={1.5}
            />
            <Path
              path={`M ${centerX + headR * 0.75} ${headCy + 2} L ${
                centerX + headR + 3
              } ${headCy - 8}`}
              color="#C7CDD1"
              style="stroke"
              strokeWidth={1.5}
            />
          </Group>
        )}

        {showCough && (
          <Group transform={coughTransform}>
            <Circle
              cx={centerX + headR * 0.6}
              cy={headCy + headR * 0.4}
              r={4}
              color={aqhiAccentColor}
              opacity={coughOpacity}
            />
            <Circle
              cx={centerX + headR * 0.85}
              cy={headCy + headR * 0.25}
              r={2.5}
              color={aqhiAccentColor}
              opacity={coughOpacity}
            />
          </Group>
        )}
      </Group>

      {/* DOG */}
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

        {heatSevere && (
          <>
            <Path
              path={`M ${petCx - 14} ${petCy - 26} Q ${petCx - 17} ${
                petCy - 20
              } ${petCx - 14} ${petCy - 17} Q ${petCx - 11} ${petCy - 20} ${
                petCx - 14
              } ${petCy - 26}`}
              color="#FFFFFF"
              opacity={sweatOpacityA}
            />
            <Path
              path={`M ${petCx + 12} ${petCy - 25} Q ${petCx + 15} ${
                petCy - 19
              } ${petCx + 12} ${petCy - 16} Q ${petCx + 9} ${petCy - 19} ${
                petCx + 12
              } ${petCy - 25}`}
              color="#FFFFFF"
              opacity={dogSweatOpacity}
            />
          </>
        )}
      </Group>
    </Group>
  );
};

export default CharacterLayer;
