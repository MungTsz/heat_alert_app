// src/components/alerts/AudiencePicker.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Check } from 'lucide-react-native';
import { AudienceGroup } from '../../types/alerts';
import { AUDIENCE_ALERT_LEVELS, AUDIENCE_GROUPS } from '../../config/alertConfig';
import { AUDIENCE_COPY, PROFILE_EDITOR_COPY } from '../../config/alertCopy';
import { ALERT_UI } from '../../config/alertUiConfig';
import { formatLevelWithRange } from '../../utils/hazardLevels';

type Props = {
  value: AudienceGroup;
  onChange: (audience: AudienceGroup) => void;
};

// "Who is here?" as one card per audience — shared by first-launch
// onboarding and the profile editor so the question looks and reads the
// same everywhere.
const AudiencePicker = ({ value, onChange }: Props) => (
  <View style={styles.list} accessibilityRole="radiogroup">
    {AUDIENCE_GROUPS.map(audience => {
      const selected = value === audience;
      const levels = AUDIENCE_ALERT_LEVELS[audience];
      return (
        <TouchableOpacity
          key={audience}
          style={[styles.card, selected && styles.cardSelected]}
          onPress={() => onChange(audience)}
          activeOpacity={0.7}
          accessibilityRole="radio"
          accessibilityState={{ selected }}
        >
          <View style={styles.text}>
            <Text style={[styles.label, selected && styles.labelSelected]}>
              {AUDIENCE_COPY[audience].label}
            </Text>
            {/* The result of the choice, shown as it's made — people start
                learning the levels before any alert arrives. */}
            <Text style={styles.result}>
              {PROFILE_EDITOR_COPY.audienceResult(
                formatLevelWithRange('heat', levels.heat),
                formatLevelWithRange('aqhi', levels.aqhi),
              )}
            </Text>
          </View>
          {selected && <Check size={20} color={ALERT_UI.accentColor} strokeWidth={2.5} />}
        </TouchableOpacity>
      );
    })}
  </View>
);

const styles = StyleSheet.create({
  list: { gap: 8, marginTop: 12 },
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
  result: { fontSize: 12, lineHeight: 16, color: ALERT_UI.mutedTextColor, marginTop: 3 },
});

export default AudiencePicker;
