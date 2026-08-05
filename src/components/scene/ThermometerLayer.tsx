// src/components/scene/ThermometerLayer.tsx
import React from 'react';
import {
  Group,
  RoundedRect,
  Circle,
  Rect,
  LinearGradient,
  vec,
} from '@shopify/react-native-skia';

type Props = {
  x: number;
  topY: number;
  bottomY: number;
  temperatureCelsius: number;
};

const MIN_TEMP = 15;
const MAX_TEMP = 46;
const MERCURY_COLOR = '#E53935'; // fixed red, no longer tied to heat-level scale

const ThermometerLayer: React.FC<Props> = ({
  x,
  topY,
  bottomY,
  temperatureCelsius,
}) => {
  const bulbR = 15;
  const tubeWidth = 16;
  const bulbCy = bottomY - bulbR;
  const tubeHeight = bulbCy - topY;
  const glassInset = 5;

  const fraction = Math.max(
    0,
    Math.min(1, (temperatureCelsius - MIN_TEMP) / (MAX_TEMP - MIN_TEMP)),
  );
  const fillHeight = tubeHeight * fraction;
  const fillTopY = bulbCy - fillHeight;

  const tickCount = 6;
  const ticks = Array.from({ length: tickCount }).map((_, i) => {
    const ty = topY + (tubeHeight / (tickCount - 1)) * i;
    const isLong = i % 2 === 0;
    return { ty, isLong };
  });

  return (
    <Group>
      <Circle
        cx={x + 2}
        cy={bulbCy + 2}
        r={bulbR + 3}
        color="rgba(0,0,0,0.12)"
      />

      <RoundedRect
        x={x - tubeWidth / 2}
        y={topY}
        width={tubeWidth}
        height={tubeHeight}
        r={tubeWidth / 2}
        color="#FFFFFF"
      />
      <Circle cx={x} cy={bulbCy} r={bulbR} color="#FFFFFF" />

      {ticks.map((tick, i) => (
        <Rect
          key={`tick-${i}`}
          x={x + tubeWidth / 2 - (tick.isLong ? 7 : 4)}
          y={tick.ty}
          width={tick.isLong ? 7 : 4}
          height={1.5}
          color="rgba(150,150,150,0.5)"
        />
      ))}

      <RoundedRect
        x={x - (tubeWidth - glassInset) / 2}
        y={fillTopY}
        width={tubeWidth - glassInset}
        height={bulbCy - fillTopY + (tubeWidth - glassInset) / 2}
        r={(tubeWidth - glassInset) / 2}
      >
        <LinearGradient
          start={vec(x - tubeWidth / 2, fillTopY)}
          end={vec(x + tubeWidth / 2, fillTopY)}
          colors={[MERCURY_COLOR, MERCURY_COLOR, 'rgba(255,255,255,0.35)']}
          positions={[0, 0.55, 1]}
        />
      </RoundedRect>
      <Circle
        cx={x}
        cy={bulbCy}
        r={bulbR - glassInset / 2}
        color={MERCURY_COLOR}
      />

      <RoundedRect
        x={x - tubeWidth / 2}
        y={topY}
        width={tubeWidth}
        height={tubeHeight}
        r={tubeWidth / 2}
        color="rgba(180,180,180,0.6)"
        style="stroke"
        strokeWidth={1.5}
      />
      <Circle
        cx={x}
        cy={bulbCy}
        r={bulbR}
        color="rgba(180,180,180,0.6)"
        style="stroke"
        strokeWidth={1.5}
      />

      <RoundedRect
        x={x - tubeWidth / 2 + 2}
        y={topY + 6}
        width={2.5}
        height={tubeHeight * 0.4}
        r={1.5}
        color="rgba(255,255,255,0.8)"
      />
    </Group>
  );
};

export default ThermometerLayer;
