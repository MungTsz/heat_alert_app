// src/components/EnviMapLegend.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ENVI_MAP_LEGEND_CONFIG as C } from '../config/mapLayerConfig';
import { enviMapLegendEntries } from '../utils/enviMapLayer';

type Props = {
  // 'vertical': full-size maps, beside the other layers' legends, with the
  // level names. 'compact': Home's small preview — one row of numbers and
  // colours along the bottom.
  variant: 'vertical' | 'compact';
  // The layer's current opacity, so each swatch looks the way that level
  // looks on the map (the swatch only — the text stays fully readable).
  opacity: number;
};

// Map key for the Environmental Index layer — the same container, swatch
// and label styling as HeatLegend / AqhiLegend, so the three layers read as
// one set. Colours come from ENVI_LEVELS (via enviMapLegendEntries), worst
// first like the others. It names the levels only: nothing here says how
// the index is worked out.
const EnviMapLegend: React.FC<Props> = ({ variant, opacity }) => {
  const entries = enviMapLegendEntries(opacity);
  if (variant === 'compact') {
    // Lowest first, reading left to right like Home's band.
    return (
      <View style={[styles.container, styles.compactRow]}>
        {[...entries].reverse().map(entry => (
          <View key={entry.level} style={styles.item}>
            <View style={[styles.swatch, { backgroundColor: entry.swatchColor }]} />
            <Text style={styles.label}>{entry.level}</Text>
          </View>
        ))}
      </View>
    );
  }
  return (
    <View style={styles.container}>
      {entries.map(entry => (
        <View key={entry.level} style={[styles.item, styles.verticalItem]}>
          <View style={[styles.swatch, { backgroundColor: entry.swatchColor }]} />
          <Text style={styles.label}>
            {entry.level} {entry.name}
          </Text>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  compactRow: {
    flexDirection: 'row',
    gap: C.compactItemGap,
    paddingHorizontal: 6,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  verticalItem: { paddingVertical: 1 },
  swatch: { width: C.swatchWidth, height: C.swatchHeight, borderRadius: C.swatchRadius },
  label: {
    fontSize: C.fontSize,
    color: '#333',
    fontWeight: '600',
  },
});

export default EnviMapLegend;
