// src/components/EnviBand.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ENVI_BAND_CONFIG, ENVI_LEVELS } from '../config/enviConfig';

type Props = {
  // 1-5, or null while there is no reading.
  level: number | null;
};

// The five ENVI levels as one band, with a pointer on the current one.
// Deliberately only ENVI: no heat index or AQHI markers on it, because how
// the level is worked out is not shown to the user.
const EnviBand: React.FC<Props> = ({ level }) => (
  // The card's own label already reads the level out, so the band is
  // decoration to a screen reader.
  <View accessible={false} importantForAccessibility="no-hide-descendants">
    {/* Always laid out, even with nothing to point at, so the card keeps
        its height when the first reading arrives. */}
    <View style={styles.pointerRow}>
      {ENVI_LEVELS.map(item => (
        <View key={item.level} style={styles.pointerCell}>
          {item.level === level && <View style={styles.pointer} />}
        </View>
      ))}
    </View>
    <View style={styles.cellRow}>
      {ENVI_LEVELS.map(item => (
        <View
          key={item.level}
          style={[
            styles.cell,
            { backgroundColor: item.color },
            item.level !== level && styles.cellInactive,
          ]}
        >
          <Text style={[styles.cellText, { color: item.textColor }]}>{item.level}</Text>
        </View>
      ))}
    </View>
  </View>
);

const { cellHeight, cellGap, cellRadius, inactiveOpacity, pointerSize } = ENVI_BAND_CONFIG;

const styles = StyleSheet.create({
  pointerRow: { flexDirection: 'row', gap: cellGap, height: pointerSize, marginBottom: 3 },
  pointerCell: { flex: 1, alignItems: 'center' },
  // A downward triangle drawn with borders — no asset or SVG needed.
  pointer: {
    width: 0,
    height: 0,
    borderLeftWidth: pointerSize,
    borderRightWidth: pointerSize,
    borderTopWidth: pointerSize,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#FFFFFF',
  },
  cellRow: { flexDirection: 'row', gap: cellGap },
  cell: {
    flex: 1,
    height: cellHeight,
    borderRadius: cellRadius,
    alignItems: 'center',
    justifyContent: 'center',
    // Keeps the black "Serious" cell visible against the dark glass card.
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.45)',
  },
  cellInactive: { opacity: inactiveOpacity },
  cellText: { fontSize: 13, fontWeight: '800' },
});

export default EnviBand;
