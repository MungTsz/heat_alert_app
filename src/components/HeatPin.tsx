import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';

type Props = {
  temperature: number;
  color: string;
  size?: number;
};

const HeatPin = ({ temperature, color, size = 46 }: Props) => {
  const width = size;
  const height = size * 1.35;

  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height} viewBox="0 0 46 62">
        {/* Classic teardrop pin shape: rounded top, pointed bottom tip */}
        <Path
          d="M23 0C10.3 0 0 10.3 0 23c0 17.25 23 39 23 39s23-21.75 23-39C46 10.3 35.7 0 23 0z"
          fill="#FFFFFF"
          stroke="#D0D0D0"
          strokeWidth={1}
        />
      </Svg>

      {/* Colored circle badge with the number, centered in the rounded head of the pin */}
      <View
        style={[styles.badge, { backgroundColor: color, top: height * 0.11 }]}
      >
        <Text style={styles.badgeText}>{temperature}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    alignSelf: 'center',
    width: '68%',
    aspectRatio: 1,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
});

export default HeatPin;
