// src/components/HazardCard.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { glassCardStyle, glassLabelText } from '../styles/glassCard';

type Props = {
  icon: React.ReactNode;
  label: string;
  value: string;
  classification: string;
  valueColor: string; // severity color — this is the one place color should stand out
  onPress: () => void;
};

const HazardCard: React.FC<Props> = ({
  icon,
  label,
  value,
  classification,
  valueColor,
  onPress,
}) => {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.labelRow}>
        {icon}
        <Text style={styles.label}>{label}</Text>
      </View>
      <Text style={[styles.value, { color: valueColor }]}>{value}</Text>
      <Text style={styles.classification}>{classification}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
    ...glassCardStyle,
    paddingVertical: 18,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '700',
    ...glassLabelText,
  },
  value: {
    fontSize: 44,
    fontWeight: '700',
    textAlign: 'center',
  },
  classification: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 4,
    ...glassLabelText,
  },
});

export default HazardCard;
