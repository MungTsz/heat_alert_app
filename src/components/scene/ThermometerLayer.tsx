import React from 'react';
import { Group, RoundedRect, Circle } from '@shopify/react-native-skia';
import { getHeatIndexInfo } from '../../utils/heatIndexUtils';

type Props = {
  x: number;
  topY: number;
  groundY: number;
  temperatureCelsius: number;
};

const MIN_TEMP = 15; // scale reference: empty tube
const MAX_TEMP = 46; // scale reference: full tube (matches your "Danger" threshold)

const ThermometerLayer: React.FC<Props> = ({
  x,
  topY,
  groundY,
  temperatureCelsius,
}) => {
  const { color: mercuryColor } = getHeatIndexInfo(temperatureCelsius);

  const bulbR = 16;
  const tubeWidth = 20;
  const bulbCy = groundY - bulbR;
  const tubeTop = topY;
  const tubeHeight = bulbCy - tubeTop;

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
        y={tubeTop}
        width={tubeWidth}
        height={tubeHeight}
        r={tubeWidth / 2}
        color="#F5F5F5"
      />
      <Circle cx={x} cy={bulbCy} r={bulbR} color="#F5F5F5" />

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
        y={tubeTop}
        width={tubeWidth}
        height={tubeHeight}
        r={tubeWidth / 2}
        color="#D8D8D8"
        style="stroke"
        strokeWidth={2}
      />
      <Circle
        cx={x}
        cy={bulbCy}
        r={bulbR}
        color="#D8D8D8"
        style="stroke"
        strokeWidth={2}
      />
    </Group>
  );
};

export default ThermometerLayer;
