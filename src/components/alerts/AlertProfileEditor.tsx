// src/components/alerts/AlertProfileEditor.tsx
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ChevronDown, ChevronUp } from 'lucide-react-native';
import { AudienceGroup, HazardKind, PlaceAlertProfile } from '../../types/alerts';
import { ADVANCED_LEVEL_CHOICES, HAZARD_KINDS } from '../../config/alertConfig';
import { HAZARD_COPY, PROFILE_EDITOR_COPY } from '../../config/alertCopy';
import { ALERT_UI } from '../../config/alertUiConfig';
import { formatLevelWithRange } from '../../utils/hazardLevels';
import { alertLevelFor, hasLevelOverride, withAlertLevel } from '../../utils/alertProfile';
import SettingsToggleRow from '../SettingsToggleRow';
import AudiencePicker from './AudiencePicker';
import PlaceAudienceSection from './PlaceAudienceSection';

type Props = {
  profile: PlaceAlertProfile;
  onChange: (profile: PlaceAlertProfile) => void;
  // Set when editing a saved place (who it's for, and the owner's About
  // you answer a place for yourself uses). Absent for About you itself,
  // which is always for yourself and simply asks who you are.
  forPlace?: { aboutYouAudience: AudienceGroup };
};

// The one editor for "who is here and what to alert on" — used by the
// About you sheet, the Places alert sheet and the Add place flow, so the
// question reads the same everywhere. Heat and air quality appear in the
// same order with the same controls, as peer hazards.
const AlertProfileEditor = ({ profile, onChange, forPlace }: Props) => {
  const anyOverride = HAZARD_KINDS.some(h => hasLevelOverride(profile, h));
  // Collapsed by default, and opened if a level was already changed so the
  // change is never hidden from the person who made it.
  const [advancedOpen, setAdvancedOpen] = useState(anyOverride);

  const setHazard = (hazard: HazardKind, enabled: boolean) =>
    onChange({ ...profile, hazards: { ...profile.hazards, [hazard]: enabled } });

  return (
    <View>
      {forPlace ? (
        <PlaceAudienceSection
          profile={profile}
          onChange={onChange}
          aboutYouAudience={forPlace.aboutYouAudience}
        />
      ) : (
        <>
          <Text style={styles.question}>{PROFILE_EDITOR_COPY.selfQuestion}</Text>
          <AudiencePicker
            value={profile.audience}
            onChange={audience => onChange({ ...profile, audience })}
          />
        </>
      )}

      <Text style={[styles.subheading, styles.block]}>{PROFILE_EDITOR_COPY.hazardsTitle}</Text>
      {HAZARD_KINDS.map(hazard => (
        <SettingsToggleRow
          key={hazard}
          label={HAZARD_COPY[hazard].name}
          value={profile.hazards[hazard]}
          onValueChange={enabled => setHazard(hazard, enabled)}
        />
      ))}

      <TouchableOpacity
        style={styles.advancedHeader}
        onPress={() => setAdvancedOpen(open => !open)}
        accessibilityRole="button"
        accessibilityState={{ expanded: advancedOpen }}
      >
        <Text style={styles.subheading}>{PROFILE_EDITOR_COPY.advancedTitle}</Text>
        {advancedOpen ? (
          <ChevronUp size={18} color={ALERT_UI.mutedTextColor} />
        ) : (
          <ChevronDown size={18} color={ALERT_UI.mutedTextColor} />
        )}
      </TouchableOpacity>

      {advancedOpen && (
        <View>
          <Text style={styles.hint}>{PROFILE_EDITOR_COPY.advancedHint}</Text>
          {HAZARD_KINDS.map(hazard => {
            const enabled = profile.hazards[hazard];
            // The chip shown selected is simply the level in effect — the
            // audience's until someone picks another. No separate "Default"
            // chip repeating the same level.
            const current = alertLevelFor(profile, hazard);
            const overridden = hasLevelOverride(profile, hazard);
            return (
              <View key={hazard} style={[styles.levelBlock, !enabled && styles.disabled]}>
                <View style={styles.levelHeader}>
                  <Text style={styles.levelHazard}>{HAZARD_COPY[hazard].name}</Text>
                  {overridden && enabled && (
                    <TouchableOpacity
                      onPress={() => onChange(withAlertLevel(profile, hazard, null))}
                      hitSlop={8}
                      accessibilityRole="button"
                    >
                      <Text style={styles.reset}>{PROFILE_EDITOR_COPY.reset}</Text>
                    </TouchableOpacity>
                  )}
                </View>
                <View style={styles.chipRow}>
                  {ADVANCED_LEVEL_CHOICES[hazard].map(level => {
                    const selected = current === level;
                    return (
                      <TouchableOpacity
                        key={level}
                        style={[styles.chip, selected && styles.chipSelected]}
                        onPress={() => onChange(withAlertLevel(profile, hazard, level))}
                        disabled={!enabled}
                        accessibilityRole="radio"
                        accessibilityState={{ selected, disabled: !enabled }}
                      >
                        <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                          {formatLevelWithRange(hazard, level)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  question: { fontSize: 17, fontWeight: '700', color: '#222', marginTop: 12 },
  hint: { fontSize: 12, lineHeight: 17, color: ALERT_UI.mutedTextColor, marginTop: 6 },
  block: { marginTop: 18 },
  subheading: {
    fontSize: 12,
    fontWeight: '700',
    color: '#777',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  advancedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    marginTop: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: ALERT_UI.optionBorderColor,
  },
  levelBlock: { marginTop: 12, marginBottom: 4 },
  disabled: { opacity: 0.4 },
  levelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  levelHazard: { fontSize: 14, fontWeight: '600', color: '#333' },
  reset: { fontSize: 13, fontWeight: '600', color: ALERT_UI.accentColor },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderWidth: 1,
    borderColor: ALERT_UI.optionBorderColor,
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  chipSelected: { borderColor: ALERT_UI.accentColor, backgroundColor: ALERT_UI.selectedTint },
  chipText: { fontSize: 13, color: '#555' },
  chipTextSelected: { color: ALERT_UI.accentColor, fontWeight: '700' },
});

export default AlertProfileEditor;
