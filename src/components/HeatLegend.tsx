// src/components/HeatLegend.tsx — vertical variant, same footprint as AqhiLegend
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { CircleQuestionMark } from 'lucide-react-native';
import {
  HEAT_INDEX_ZONES,
  formatHeatZoneRangeC,
} from '../utils/heatIndexUtils';

type Props = {
  onPressInfo: () => void;
};

const INFO_HIT_SLOP = { top: 8, bottom: 8, left: 8, right: 8 };

// Map key for the heat index layer. Reads HEAT_INDEX_ZONES (worst first, as
// stored) so it always matches the chart, cards and pin. The "?" opens the
// heat index explainer — the map is where people first meet the colors, so
// it's where "what does this mean?" gets asked.
const HeatLegend: React.FC<Props> = ({ onPressInfo }) => (
  <View style={styles.container}>
    <TouchableOpacity
      style={styles.header}
      onPress={onPressInfo}
      hitSlop={INFO_HIT_SLOP}
      accessibilityLabel="What is the heat index?"
    >
      <Text style={styles.title}>Feels like</Text>
      <CircleQuestionMark size={12} color="#333" />
    </TouchableOpacity>
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
    paddingHorizontal: 5,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginBottom: 3,
  },
  title: { fontSize: 9, fontWeight: '700', color: '#333' },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 2,
  },
  swatch: {
    width: 14,
    height: 10,
    borderRadius: 1.5,
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.15)', // keeps the pale Caution yellow visible
  },
  label: { fontSize: 8, color: '#333', fontWeight: '600' },
});

export default HeatLegend;
