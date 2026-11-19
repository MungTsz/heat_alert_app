// src/components/alerts/OptionCard.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Circle, CircleCheck, Square, SquareCheck } from 'lucide-react-native';
import { ALERT_UI } from '../../config/alertUiConfig';

type Props = {
  label: string;
  hint?: string;
  selected: boolean;
  // 'checkbox' for "select all that apply", 'radio' for pick one: the icon's
  // shape (square / circle) tells people which before they tap.
  kind: 'checkbox' | 'radio';
  onPress: () => void;
};

// One answer card in the About you questions — the same look for every
// question, so the three read as one short form.
const OptionCard = ({ label, hint, selected, kind, onPress }: Props) => {
  const Icon =
    kind === 'checkbox' ? (selected ? SquareCheck : Square) : selected ? CircleCheck : Circle;
  return (
    <TouchableOpacity
      style={[styles.card, selected && styles.cardSelected]}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole={kind}
      accessibilityState={kind === 'checkbox' ? { checked: selected } : { selected }}
    >
      <View style={styles.text}>
        <Text style={[styles.label, selected && styles.labelSelected]}>{label}</Text>
        {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      </View>
      <Icon
        size={ALERT_UI.optionIconSize}
        color={selected ? ALERT_UI.accentColor : ALERT_UI.optionIconIdleColor}
        strokeWidth={2}
      />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: ALERT_UI.optionBorderColor,
    borderRadius: ALERT_UI.optionRadius,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: '#fff',
  },
  cardSelected: { borderColor: ALERT_UI.accentColor, backgroundColor: ALERT_UI.selectedTint },
  text: { flex: 1 },
  label: { fontSize: 15, fontWeight: '600', color: '#333' },
  labelSelected: { color: '#222', fontWeight: '700' },
  hint: { fontSize: 12, lineHeight: 16, color: ALERT_UI.mutedTextColor, marginTop: 2 },
});

export default OptionCard;
