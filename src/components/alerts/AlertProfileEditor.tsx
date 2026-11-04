// src/components/alerts/AlertProfileEditor.tsx
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ChevronDown, ChevronUp } from 'lucide-react-native';
import { AudienceGroup, CaringFor, HazardKind, PlaceAlertProfile } from '../../types/alerts';
import {
  ADVANCED_LEVEL_CHOICES,
  AUDIENCE_ALERT_LEVELS,
  AUDIENCE_GROUPS,
  HAZARD_KINDS,
} from '../../config/alertConfig';
import {
  AUDIENCE_COPY,
  CARING_FOR_COPY,
  HAZARD_COPY,
  PROFILE_EDITOR_COPY,
} from '../../config/alertCopy';
import { ALERT_UI } from '../../config/alertUiConfig';
import { formatLevelWithRange } from '../../utils/hazardLevels';
import SettingsToggleRow from '../SettingsToggleRow';
import SegmentedControl from '../SegmentedControl';

type Props = {
  profile: PlaceAlertProfile;
  onChange: (profile: PlaceAlertProfile) => void;
  question: string;
  // Off for "About you": your own location is always for yourself.
  showCaringFor: boolean;
};

const CARING_FOR_OPTIONS: { value: CaringFor; label: string }[] = [
  { value: 'self', label: CARING_FOR_COPY.self },
  { value: 'family', label: CARING_FOR_COPY.family },
];

// The one editor for "who is here and what to alert on" — used by Settings
// (About you), the Community alert sheet and the Add place flow, so the
// question reads the same everywhere. Heat and air quality appear in the
// same order with the same controls, as peer hazards.
const AlertProfileEditor = ({ profile, onChange, question, showCaringFor }: Props) => {
  // Collapsed by default, and opened automatically if an override is
  // already set so it is never hidden from the person who chose it.
  const [advancedOpen, setAdvancedOpen] = useState(
    profile.levelOverride !== undefined && Object.keys(profile.levelOverride).length > 0,
  );

  const setAudience = (audience: AudienceGroup) => onChange({ ...profile, audience });

  const setHazard = (hazard: HazardKind, enabled: boolean) =>
    onChange({ ...profile, hazards: { ...profile.hazards, [hazard]: enabled } });

  // Chips only ever offer ADVANCED_LEVEL_CHOICES[hazard], so the level is a
  // valid one for that hazard. Clearing the last override drops the field,
  // keeping "follows the audience" a single representation.
  const setOverride = (hazard: HazardKind, level: string | null) => {
    const levelOverride: Record<string, string> = { ...profile.levelOverride };
    if (level === null) delete levelOverride[hazard];
    else levelOverride[hazard] = level;
    onChange({
      ...profile,
      levelOverride:
        Object.keys(levelOverride).length > 0
          ? (levelOverride as PlaceAlertProfile['levelOverride'])
          : undefined,
    });
  };

  return (
    <View>
      <Text style={styles.question}>{question}</Text>
      {showCaringFor && <Text style={styles.hint}>{PROFILE_EDITOR_COPY.pickMostCare}</Text>}

      {AUDIENCE_GROUPS.map(audience => {
        const selected = profile.audience === audience;
        const levels = AUDIENCE_ALERT_LEVELS[audience];
        return (
          <TouchableOpacity
            key={audience}
            style={styles.option}
            onPress={() => setAudience(audience)}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
          >
            <View style={[styles.radio, selected && styles.radioSelected]}>
              {selected && <View style={styles.radioDot} />}
            </View>
            <View style={styles.optionText}>
              <Text style={[styles.optionLabel, selected && styles.optionLabelSelected]}>
                {AUDIENCE_COPY[audience].label}
              </Text>
              {/* Shows the result of the choice as it's made — the user
                  starts learning the levels before any alert arrives. */}
              <Text style={styles.optionResult}>
                {PROFILE_EDITOR_COPY.audienceResult(
                  formatLevelWithRange('heat', levels.heat),
                  formatLevelWithRange('aqhi', levels.aqhi),
                )}
              </Text>
            </View>
          </TouchableOpacity>
        );
      })}

      {showCaringFor && (
        <View style={styles.block}>
          <SegmentedControl
            options={CARING_FOR_OPTIONS}
            value={profile.caringFor}
            onChange={caringFor => onChange({ ...profile, caringFor })}
          />
          {profile.caringFor === 'family' && (
            <Text style={styles.hint}>{PROFILE_EDITOR_COPY.familyHint}</Text>
          )}
        </View>
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
            const override = profile.levelOverride?.[hazard];
            const enabled = profile.hazards[hazard];
            const audienceLevel = AUDIENCE_ALERT_LEVELS[profile.audience][hazard];
            const chips: { level: string | null; label: string }[] = [
              { level: null, label: `${PROFILE_EDITOR_COPY.followAudience}: ${audienceLevel}` },
              ...ADVANCED_LEVEL_CHOICES[hazard].map(level => ({
                level,
                label: formatLevelWithRange(hazard, level),
              })),
            ];
            return (
              <View key={hazard} style={[styles.levelBlock, !enabled && styles.disabled]}>
                <Text style={styles.levelHazard}>{HAZARD_COPY[hazard].name}</Text>
                <View style={styles.chipRow}>
                  {chips.map(chip => {
                    const selected = (override ?? null) === chip.level;
                    return (
                      <TouchableOpacity
                        key={chip.label}
                        style={[styles.chip, selected && styles.chipSelected]}
                        onPress={() => setOverride(hazard, chip.level)}
                        disabled={!enabled}
                        accessibilityRole="radio"
                        accessibilityState={{ selected, disabled: !enabled }}
                      >
                        <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                          {chip.label}
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
  block: { marginTop: 16 },
  option: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 10, gap: 12 },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#C4C4C4',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  radioSelected: { borderColor: ALERT_UI.accentColor },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: ALERT_UI.accentColor },
  optionText: { flex: 1 },
  optionLabel: { fontSize: 15, color: '#333', fontWeight: '500' },
  optionLabelSelected: { fontWeight: '700', color: '#222' },
  optionResult: { fontSize: 12, lineHeight: 16, color: ALERT_UI.mutedTextColor, marginTop: 2 },
  subheading: { fontSize: 13, fontWeight: '700', color: '#555' },
  advancedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    marginTop: 4,
  },
  levelBlock: { marginTop: 10, marginBottom: 6 },
  disabled: { opacity: 0.4 },
  levelHazard: { fontSize: 13, fontWeight: '600', color: '#333', marginBottom: 6 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    borderWidth: 1,
    borderColor: '#D6D6D6',
    borderRadius: 14,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  chipSelected: { borderColor: ALERT_UI.accentColor, backgroundColor: '#FDECEC' },
  chipText: { fontSize: 12, color: '#555' },
  chipTextSelected: { color: ALERT_UI.accentColor, fontWeight: '700' },
});

export default AlertProfileEditor;
