// src/components/AqhiLegend.tsx — vertical variant
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { getAqhiInfo, formatAqhiValue } from '../utils/aqhiUtils';

const VALUES = [11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1]; // top-to-bottom, worst first

const AqhiLegend: React.FC = () => (
  <View style={styles.container}>
    {VALUES.map(v => {
      const { color } = getAqhiInfo(v);
      return (
        <View key={v} style={styles.item}>
          <View style={[styles.swatch, { backgroundColor: color }]} />
          <Text style={styles.label}>{formatAqhiValue(v)}</Text>
        </View>
      );
    })}
  </View>
);

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 1,
  },
  swatch: { width: 14, height: 8, borderRadius: 1.5 },
  label: {
    fontSize: 8,
    color: '#333',
    fontWeight: '600',
    width: 16,
    textAlign: 'right',
  },
});

export default AqhiLegend;
