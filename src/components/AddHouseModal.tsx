import React from 'react';
import { Group, RoundedRect, Circle } from '@shopify/react-native-skia';
import { getHeatIndexInfo } from '../utils/heatIndexUtils';

type Props = {
  x: number;
  topY: number;
  bottomY: number;
  temperatureCelsius: number;
};

const MIN_TEMP = 15; // empty tube reference
const MAX_TEMP = 46; // full tube reference

const ThermometerLayer: React.FC<Props> = ({
  x,
  topY,
  bottomY,
  temperatureCelsius,
}) => {
  const { color: mercuryColor } = getHeatIndexInfo(temperatureCelsius);

  const bulbR = 14;
  const tubeWidth = 18;
  const bulbCy = bottomY - bulbR;
  const tubeHeight = bulbCy - topY;

  const fraction = Math.max(
    0,
    Math.min(1, (temperatureCelsius - MIN_TEMP) / (MAX_TEMP - MIN_TEMP)),
  );
  const fillHeight = tubeHeight * fraction;
  const fillTopY = bulbCy - fillHeight;
  const glassInset = 4;

  return (
    <Group>
      {/* Glass casing */}
      <RoundedRect
        x={x - tubeWidth / 2}
        y={topY}
        width={tubeWidth}
        height={tubeHeight}
        r={tubeWidth / 2}
        color="#FFFFFF"
        opacity={0.9}
      />
      <Circle cx={x} cy={bulbCy} r={bulbR} color="#FFFFFF" opacity={0.9} />

      {/* Mercury fill */}
      <RoundedRect
        x={x - (tubeWidth - glassInset) / 2}
        y={fillTopY}
        width={tubeWidth - glassInset}
        height={bulbCy - fillTopY + (tubeWidth - glassInset) / 2}
        r={(tubeWidth - glassInset) / 2}
        color={mercuryColor}
      />
      <Circle
        cx={x}
        cy={bulbCy}
        r={bulbR - glassInset / 2}
        color={mercuryColor}
      />

      {/* Outline */}
      <RoundedRect
        x={x - tubeWidth / 2}
        y={topY}
        width={tubeWidth}
        height={tubeHeight}
        r={tubeWidth / 2}
        color="#E0E0E0"
        style="stroke"
        strokeWidth={2}
      />
      <Circle
        cx={x}
        cy={bulbCy}
        r={bulbR}
        color="#E0E0E0"
        style="stroke"
        strokeWidth={2}
      />
    </Group>
  );
};

export default ThermometerLayer;
