import React from 'react';
import { Rect } from '@shopify/react-native-skia';

type Props = {
  width: number;
  height: number;
  horizonY: number;
  color: string;
};

const LawnLayer: React.FC<Props> = ({ width, height, horizonY, color }) => (
  <Rect
    x={0}
    y={horizonY}
    width={width}
    height={height - horizonY}
    color={color}
  />
);

export default LawnLayer;
