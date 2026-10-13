// src/components/ExposureIoLegend.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { EXPOSURE_IO_TYPES } from '../types/exposure';
import { EXPOSURE_IO_CONFIG } from '../config/exposureIoConfig';

// The io color key shared by every exposure stacked-bar chart. Pagers render
// it once above the swipeable area so it stays put while pages move.
const ExposureIoLegend: React.FC = () => (
  <View style={styles.row}>
    {EXPOSURE_IO_TYPES.map(io => (
      <View key={io} style={styles.item}>
        <View style={[styles.dot, { backgroundColor: EXPOSURE_IO_CONFIG[io].color }]} />
        <Text style={styles.text}>{EXPOSURE_IO_CONFIG[io].label}</Text>
      </View>
    ))}
  </View>
);

const styles = StyleSheet.create({
  // Wraps: five io types no longer fit on one line on narrow phones.
  row: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 14, rowGap: 4, marginBottom: 6 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  text: { fontSize: 11, color: '#8E8E93' },
});

export default ExposureIoLegend;
