// src/components/scene/SkyLayer.tsx
import React from 'react';
import {
  Rect,
  Circle,
  Path,
  LinearGradient,
  vec,
  Group,
} from '@shopify/react-native-skia';

type Props = {
  width: number;
  horizonY: number;
  topColor: string;
  bottomColor: string;
  sunColor: string;
};

const SkyLayer: React.FC<Props> = ({
  width,
  horizonY,
  topColor,
  bottomColor,
  sunColor,
}) => {
  const sunCx = width * 0.72;
  const sunCy = Math.max(horizonY - 65, 40);

  return (
    <Group>
      {/* 1. Sky Gradient */}
      <Rect x={0} y={0} width={width} height={horizonY + 10}>
        <LinearGradient
          start={vec(0, 0)}
          end={vec(0, horizonY)}
          colors={[topColor, bottomColor]}
        />
      </Rect>

      {/* 2. Sun Aura Rings */}
      <Circle cx={sunCx} cy={sunCy} r={110} color="#FFA726" opacity={0.25} />
      <Circle cx={sunCx} cy={sunCy} r={80} color="#FFB74D" opacity={0.35} />
      <Circle cx={sunCx} cy={sunCy} r={55} color="#FFE082" opacity={0.5} />

      {/* 3. Core Sun */}
      <Circle cx={sunCx} cy={sunCy} r={36} color={sunColor} />

      {/* 4. Radiating Sunbeams */}
      <Path
        path={`M ${sunCx} ${sunCy} L ${sunCx - 140} ${horizonY + 100} L ${
          sunCx - 80
        } ${horizonY + 100} Z`}
        color="#FFE082"
        opacity={0.18}
      />
      <Path
        path={`M ${sunCx} ${sunCy} L ${sunCx - 60} ${
          horizonY + 100
        } L ${sunCx} ${horizonY + 100} Z`}
        color="#FFE082"
        opacity={0.15}
      />
      <Path
        path={`M ${sunCx} ${sunCy} L ${sunCx + 20} ${horizonY + 100} L ${
          sunCx + 90
        } ${horizonY + 100} Z`}
        color="#FFE082"
        opacity={0.18}
      />
    </Group>
  );
};

export default SkyLayer;
