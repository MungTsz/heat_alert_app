// src/components/DualStatPin.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MapPin } from 'lucide-react-native';
import { valueToPinColor } from '../utils/idw';
import { getAqhiInfo } from '../utils/aqhiUtils';

type Props = {
  temperature: number;
  aqhi: number;
};

const DualStatPin: React.FC<Props> = ({ temperature, aqhi }) => {
  const heatColor = valueToPinColor(temperature);
  const { color: aqhiColor } = getAqhiInfo(aqhi);

  return (
    <View style={styles.wrapper}>
      <View style={styles.pill}>
        <View style={[styles.dot, { backgroundColor: heatColor }]} />
        <Text style={styles.text}>{temperature}°</Text>
        <View style={styles.divider} />
        <View style={[styles.dot, { backgroundColor: aqhiColor }]} />
        <Text style={styles.text}>AQHI {aqhi}</Text>
      </View>

      <MapPin size={30} color="#2B7A9E" fill="#2B7A9E" strokeWidth={1.5} />
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: { alignItems: 'center' },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: 0.5,
    borderColor: '#E2E2E2',
    gap: 6,
    marginBottom: 2,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  divider: {
    width: 0.5,
    height: 14,
    backgroundColor: '#DDD',
    marginHorizontal: 2,
  },
  text: { fontSize: 12, fontWeight: '700', color: '#222' },
});

export default DualStatPin;
