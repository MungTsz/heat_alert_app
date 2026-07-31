import React from 'react';
import { Group, Path, Rect } from '@shopify/react-native-skia';

type Props = {
  width: number;
  horizonY: number;
};

const HorizonLayer: React.FC<Props> = ({ width, horizonY }) => {
  const houseX = width * 0.16;
  const houseW = 70;
  const houseH = 56;
  const roofH = 30;

  const houseBaseY = horizonY;
  const houseTopY = houseBaseY - houseH;
  const roofPeakY = houseTopY - roofH;

  const housePath = `
    M ${houseX} ${houseBaseY}
    L ${houseX} ${houseTopY}
    L ${houseX + houseW / 2} ${roofPeakY}
    L ${houseX + houseW} ${houseTopY}
    L ${houseX + houseW} ${houseBaseY}
    Z
  `;

  const doorW = 16;
  const doorH = 26;
  const doorX = houseX + houseW / 2 - doorW / 2;
  const doorY = houseBaseY - doorH;

  const windowSize = 14;
  const windowY = houseTopY + 10;

  // Small grass tuft strokes spaced along the horizon
  const tuftXPositions = Array.from({ length: 10 }).map(
    (_, i) => (width / 10) * i + 12,
  );

  return (
    <Group>
      <Path path={housePath} color="#7C5A46" />
      <Rect x={doorX} y={doorY} width={doorW} height={doorH} color="#4A3626" />
      <Rect
        x={houseX + 10}
        y={windowY}
        width={windowSize}
        height={windowSize}
        color="#FFE9A8"
      />
      <Rect
        x={houseX + houseW - 10 - windowSize}
        y={windowY}
        width={windowSize}
        height={windowSize}
        color="#FFE9A8"
      />

      {tuftXPositions.map((x, i) => (
        <Path
          key={`tuft-${i}`}
          path={`M ${x} ${horizonY} Q ${x + 4} ${horizonY - 12} ${
            x + 8
          } ${horizonY} Q ${x + 10} ${horizonY - 16} ${x + 14} ${horizonY}`}
          color="#4C8C4A"
          style="stroke"
          strokeWidth={3}
        />
      ))}
    </Group>
  );
};

export default HorizonLayer;
