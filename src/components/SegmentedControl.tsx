// src/components/SegmentedControl.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ALERT_UI } from '../config/alertUiConfig';

type Option<T extends string> = { value: T; label: string };

type Props<T extends string> = {
  options: readonly Option<T>[];
  value: T;
  onChange: (value: T) => void;
};

// A pill row for picking one of a few options (who a place is for, when to
// send an all clear).
const SegmentedControl = <T extends string>({ options, value, onChange }: Props<T>) => (
  <View style={styles.row} accessibilityRole="radiogroup">
    {options.map(option => {
      const selected = option.value === value;
      return (
        <TouchableOpacity
          key={option.value}
          style={[styles.segment, selected && styles.segmentSelected]}
          onPress={() => onChange(option.value)}
          accessibilityRole="radio"
          accessibilityState={{ selected }}
        >
          <Text style={[styles.text, selected && styles.textSelected]} numberOfLines={1}>
            {option.label}
          </Text>
        </TouchableOpacity>
      );
    })}
  </View>
);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    backgroundColor: ALERT_UI.trackColor,
    borderRadius: 20,
    padding: 3,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 17,
  },
  segmentSelected: {
    backgroundColor: '#FFFFFF',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  text: { fontSize: 13, fontWeight: '600', color: '#666' },
  textSelected: { color: ALERT_UI.accentColor },
});

export default SegmentedControl;
