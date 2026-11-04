// src/components/ChartBandLegend.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export type ChartBandLegendItem = {
  label: string;
  range: string;
  color: string;
};

type Props = { items: ChartBandLegendItem[] };

const LABEL_LINE_HEIGHT = 11;

// The color-band key under both forecast charts (heat index and AQHI), so
// the two always share one layout: every band on a single row, each taking
// an equal share of the width. Labels get a fixed two-line slot, so a long
// name ("Extreme Caution", "Very High") wrapping doesn't push its range
// below the others — swatches, names and ranges each stay on one line.
// Only the layout is shared; each chart still passes its own colors.
const ChartBandLegend: React.FC<Props> = ({ items }) => (
  <View style={styles.row}>
    {items.map(item => (
      <View key={item.label} style={styles.item}>
        <View style={[styles.swatch, { backgroundColor: item.color }]} />
        <View style={styles.labelSlot}>
          <Text style={styles.label} numberOfLines={2}>
            {item.label}
          </Text>
        </View>
        <Text style={styles.range} numberOfLines={1}>
          {item.range}
        </Text>
      </View>
    ))}
  </View>
);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    marginTop: 16,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#EDF2F7',
  },
  item: { flex: 1, alignItems: 'center', paddingHorizontal: 2 },
  swatch: {
    width: 24,
    height: 14,
    borderRadius: 2,
    marginBottom: 3,
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.12)', // keeps pale swatches visible on white
  },
  labelSlot: {
    height: LABEL_LINE_HEIGHT * 2,
    justifyContent: 'center',
  },
  label: {
    fontSize: 9,
    lineHeight: LABEL_LINE_HEIGHT,
    fontWeight: '700',
    color: '#333',
    textAlign: 'center',
  },
  range: { fontSize: 8, color: '#666', marginTop: 1 },
});

export default ChartBandLegend;
