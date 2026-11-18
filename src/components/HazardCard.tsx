// src/components/HazardCard.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { glassCardStyle, glassLabelText } from '../styles/glassCard';
import { HOME_LAYOUT_CONFIG } from '../config/homeLayoutConfig';

type Props = {
  icon: React.ReactNode;
  label: string;
  value: string;
  classification: string;
  valueColor: string; // severity color — this is the one place color should stand out
  onPress: () => void;
  // A told alert for this hazard at the user's location (AlertBadge).
  badge?: React.ReactNode;
  // Smaller padding and type, for when the card is supporting detail under
  // a headline (Home's ENVI card) rather than the headline itself.
  compact?: boolean;
};

const HazardCard: React.FC<Props> = ({
  icon,
  label,
  value,
  classification,
  valueColor,
  onPress,
  badge,
  compact = false,
}) => {
  return (
    <TouchableOpacity
      style={[styles.card, compact && styles.cardCompact]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={[styles.labelRow, compact && styles.labelRowCompact]}>
        {icon}
        <Text style={[styles.label, compact && styles.labelCompact]}>{label}</Text>
      </View>
      <Text style={[styles.value, compact && styles.valueCompact, { color: valueColor }]}>
        {value}
      </Text>
      <Text style={[styles.classification, compact && styles.classificationCompact]}>
        {classification}
      </Text>
      {badge && <View style={[styles.badge, compact && styles.badgeCompact]}>{badge}</View>}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
    ...glassCardStyle,
    paddingVertical: HOME_LAYOUT_CONFIG.hazardCardPaddingVertical,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  cardCompact: {
    paddingVertical: HOME_LAYOUT_CONFIG.hazardCardCompactPaddingVertical,
    paddingHorizontal: 10,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  labelRowCompact: { marginBottom: 2 },
  label: {
    fontSize: 16,
    fontWeight: '700',
    ...glassLabelText,
  },
  labelCompact: { fontSize: 13 },
  value: {
    fontSize: 44,
    fontWeight: '700',
    textAlign: 'center',
  },
  valueCompact: { fontSize: 30 },
  classification: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 4,
    ...glassLabelText,
  },
  classificationCompact: { fontSize: 14, marginTop: 0 },
  badge: {
    marginTop: 8,
    alignItems: 'center',
  },
  badgeCompact: { marginTop: 6 },
});

export default HazardCard;
