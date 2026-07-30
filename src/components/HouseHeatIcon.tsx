import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';

type Props = {
  temperature: number;
  color: string;
  size?: number;
};

const HouseHeatIcon = ({ temperature, color, size = 48 }: Props) => {
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox="0 0 24 24">
        {/* House silhouette: square body + triangular roof */}
        <Path
          d="M12 2.5 L22 11 H19 V21 H14 V15 H10 V21 H5 V11 H2 Z"
          fill={color}
        />
      </Svg>
      <View style={StyleSheet.absoluteFill}>
        <Text style={[styles.text, { fontSize: size * 0.32 }]}>
          {temperature}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  text: {
    flex: 1,
    textAlign: 'center',
    textAlignVertical: 'center', // Android-only, centers vertically
    color: '#FFFFFF',
    fontWeight: 'bold',
    marginTop: 4,
  },
});

export default HouseHeatIcon;
