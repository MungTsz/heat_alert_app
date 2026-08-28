// src/components/scene/UrbanBackdropLayer.tsx
import React from 'react';
import { Group, Rect } from '@shopify/react-native-skia';

type Props = {
  width: number;
  horizonY: number;
};

// A simple flat-color skyline silhouette behind the character — gives the
// haze layer something visually distinct to sit in front of, and reads as
// "street/urban" context rather than empty sky.
const UrbanBackdropLayer: React.FC<Props> = ({ width, horizonY }) => {
  const buildings = [
    { x: width * 0.02, w: 40, h: 90 },
    { x: width * 0.14, w: 55, h: 130 },
    { x: width * 0.3, w: 35, h: 70 },
    { x: width * 0.62, w: 50, h: 110 },
    { x: width * 0.78, w: 60, h: 150 },
    { x: width * 0.92, w: 40, h: 85 },
  ];

  return (
    <Group>
      {buildings.map((b, i) => (
        <Rect
          key={`building-${i}`}
          x={b.x}
          y={horizonY - b.h + 15}
          width={b.w}
          height={b.h}
          color="#4A5A6B"
          opacity={0.55}
        />
      ))}
    </Group>
  );
};

export default UrbanBackdropLayer;
