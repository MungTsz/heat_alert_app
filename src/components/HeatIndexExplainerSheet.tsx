// src/components/HeatIndexExplainerSheet.tsx
import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import ForecastSheet from './ForecastSheet';
import {
  HEAT_INDEX_ZONES,
  formatHeatZoneRangeC,
} from '../utils/heatIndexUtils';

type Props = {
  visible: boolean;
  onClose: () => void;
};

// The one place the app explains why it warns by heat index rather than air
// temperature, opened from every "?" next to a heat value. The level table
// is HEAT_INDEX_ZONES itself (the NWS reference table), so it can never
// disagree with the colors and alert text used elsewhere.
const HeatIndexExplainerSheet: React.FC<Props> = ({ visible, onClose }) => (
  <ForecastSheet visible={visible} title="What is the heat index?" onClose={onClose}>
    <ScrollView showsVerticalScrollIndicator={false}>
      <Text style={styles.paragraph}>
        Heat index is how hot it actually feels to your body once humidity is
        combined with the air temperature.
      </Text>
      <Text style={styles.paragraph}>
        Your body cools itself by sweating. In humid air, sweat evaporates
        slowly, so you feel hotter than the thermometer says — and heat
        illness can set in at temperatures that don't sound dangerous.
      </Text>

      {/* Worked example from the NWS heat index chart (88°F / 80% RH ≈ 106°F) */}
      <View style={styles.example}>
        <Text style={styles.exampleText}>
          A temperature of 31°C at 80% humidity feels like about{' '}
          <Text style={styles.exampleStrong}>41°C</Text> — already at the
          Danger level.
        </Text>
      </View>

      <Text style={styles.paragraph}>
        That's why this app's colors and alerts follow the heat index, not the
        air temperature.
      </Text>

      <Text style={styles.tableTitle}>Heat index levels</Text>
      {HEAT_INDEX_ZONES.map(zone => (
        <View key={zone.classification} style={styles.levelRow}>
          <View style={[styles.swatch, { backgroundColor: zone.color }]} />
          <View style={styles.levelText}>
            <Text style={styles.levelName}>
              {zone.classification}
              <Text style={styles.levelRange}>
                {'  '}
                {formatHeatZoneRangeC(zone)}
              </Text>
            </Text>
            <Text style={styles.levelRisk}>{zone.risk}</Text>
          </View>
        </View>
      ))}
    </ScrollView>
  </ForecastSheet>
);

const styles = StyleSheet.create({
  paragraph: {
    fontSize: 14,
    lineHeight: 20,
    color: '#333',
    marginBottom: 10,
  },
  example: {
    backgroundColor: '#FFF4E5',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  exampleText: { fontSize: 14, lineHeight: 20, color: '#333' },
  exampleStrong: { fontWeight: '700', color: '#C2410C' },
  tableTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#222',
    marginTop: 6,
    marginBottom: 8,
  },
  levelRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 10,
  },
  swatch: {
    width: 18,
    height: 18,
    borderRadius: 4,
    marginTop: 1,
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.15)', // keeps the pale Caution yellow visible on white
  },
  levelText: { flex: 1 },
  levelName: { fontSize: 13, fontWeight: '700', color: '#222' },
  levelRange: { fontSize: 12, fontWeight: '500', color: '#666' },
  levelRisk: { fontSize: 12, lineHeight: 17, color: '#555', marginTop: 2 },
});

export default HeatIndexExplainerSheet;
