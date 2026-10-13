// src/components/addPlace/StepDots.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

type Props = { current: number; total: number };

// "● ○  Step 1 of 2" — tells the user up front how short the flow is.
const StepDots: React.FC<Props> = ({ current, total }) => (
  <View style={styles.row}>
    {Array.from({ length: total }, (_, i) => (
      <View key={i} style={[styles.dot, i + 1 === current && styles.dotActive]} />
    ))}
    <Text style={styles.text}>
      Step {current} of {total}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#D6D6D6' },
  dotActive: { backgroundColor: '#333' },
  text: { fontSize: 12, color: '#888', marginLeft: 4, fontWeight: '600' },
});

export default StepDots;
