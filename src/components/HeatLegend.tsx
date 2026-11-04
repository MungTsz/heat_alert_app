// src/components/HeatLegend.tsx — vertical variant, mirrors AqhiLegend
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import {
  HEAT_INDEX_ZONES,
  formatHeatZoneRangeC,
} from '../utils/heatIndexUtils';

// Map key for the heat index layer — deliberately the same container, swatch
// and label styling as AqhiLegend so the two hazard layers read as peers.
// Reads HEAT_INDEX_ZONES (worst first, as stored) so it always matches the
// chart, cards and pin.
const HeatLegend: React.FC = () => (
  <View style={styles.container}>
    {HEAT_INDEX_ZONES.map(zone => (
      <View key={zone.classification} style={styles.item}>
        <View style={[styles.swatch, { backgroundColor: zone.color }]} />
        <Text style={styles.label}>{formatHeatZoneRangeC(zone)}</Text>
      </View>
    ))}
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
  },
});

export default HeatLegend;
