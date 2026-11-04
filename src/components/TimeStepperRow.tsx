// src/components/TimeStepperRow.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Minus, Plus } from 'lucide-react-native';
import { QUIET_HOURS_STEP_MINUTES } from '../config/alertConfig';
import { ALERT_UI } from '../config/alertUiConfig';

const MINUTES_PER_DAY = 24 * 60;

type Props = {
  label: string;
  minuteOfDay: number;
  onChange: (minuteOfDay: number) => void;
};

const formatMinuteOfDay = (minute: number) =>
  `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`;

// − 23:00 + — a time picker without a native dependency. Wraps around
// midnight, since quiet hours usually span it.
const TimeStepperRow = ({ label, minuteOfDay, onChange }: Props) => {
  const step = (direction: 1 | -1) =>
    onChange(
      (minuteOfDay + direction * QUIET_HOURS_STEP_MINUTES + MINUTES_PER_DAY) % MINUTES_PER_DAY,
    );

  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.stepper}>
        <TouchableOpacity
          onPress={() => step(-1)}
          hitSlop={8}
          accessibilityLabel={`${label} earlier`}
        >
          <Minus size={18} color={ALERT_UI.accentColor} />
        </TouchableOpacity>
        <Text style={styles.time}>{formatMinuteOfDay(minuteOfDay)}</Text>
        <TouchableOpacity onPress={() => step(1)} hitSlop={8} accessibilityLabel={`${label} later`}>
          <Plus size={18} color={ALERT_UI.accentColor} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  label: { fontSize: 14, color: '#333' },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  time: {
    fontSize: 15,
    fontWeight: '700',
    color: '#333',
    minWidth: 48,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
});

export default TimeStepperRow;
