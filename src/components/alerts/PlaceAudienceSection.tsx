// src/components/alerts/PlaceAudienceSection.tsx
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { AudienceGroup, CaringFor, PlaceAlertProfile } from '../../types/alerts';
import { AUDIENCE_COPY, CARING_FOR_COPY, PROFILE_EDITOR_COPY } from '../../config/alertCopy';
import { ALERT_UI } from '../../config/alertUiConfig';
import { withCaringFor, withPlaceAudience } from '../../utils/alertProfile';
import SegmentedControl from '../SegmentedControl';
import AudiencePicker from './AudiencePicker';

type Props = {
  profile: PlaceAlertProfile;
  onChange: (profile: PlaceAlertProfile) => void;
  // The owner's About you answer — what a place for yourself uses.
  aboutYouAudience: AudienceGroup;
};

const CARING_FOR_OPTIONS: { value: CaringFor; label: string }[] = [
  { value: 'self', label: CARING_FOR_COPY.self },
  { value: 'family', label: CARING_FOR_COPY.family },
];

// "Who is this place for?" first, because it decides whether there is
// anything left to ask: who the owner is was answered once at first launch,
// so a place for yourself just shows that answer (changeable, for a home
// shared with someone who needs more care). Only a place for someone else
// opens the full audience list.
const PlaceAudienceSection = ({ profile, onChange, aboutYouAudience }: Props) => {
  const following = profile.caringFor === 'self' && profile.followsAboutYou === true;
  // Open from the start when this place already has its own answer, so
  // that answer is never hidden from the person who chose it.
  const [pickerOpen, setPickerOpen] = useState(!following);
  const ownPicker = profile.caringFor === 'self' && (pickerOpen || !following);

  const audiencePicker = (
    <>
      <Text style={styles.hint}>{PROFILE_EDITOR_COPY.pickMostCare}</Text>
      <AudiencePicker
        value={profile.audience}
        onChange={audience => onChange(withPlaceAudience(profile, audience, aboutYouAudience))}
      />
    </>
  );

  return (
    <View>
      <Text style={styles.question}>{PROFILE_EDITOR_COPY.placeForQuestion}</Text>
      <View style={styles.segment}>
        <SegmentedControl
          options={CARING_FOR_OPTIONS}
          value={profile.caringFor}
          onChange={caringFor => {
            // Back to "same as me" whenever the person switches to themself.
            if (caringFor === 'self') setPickerOpen(false);
            onChange(withCaringFor(profile, caringFor, aboutYouAudience));
          }}
        />
      </View>

      {profile.caringFor === 'family' && (
        <View style={styles.block}>
          <Text style={styles.subheading}>{PROFILE_EDITOR_COPY.placeQuestion}</Text>
          {audiencePicker}
          <Text style={styles.hint}>{PROFILE_EDITOR_COPY.familyHint}</Text>
        </View>
      )}

      {profile.caringFor === 'self' && !ownPicker && (
        <View style={styles.ownCard}>
          <View style={styles.ownText}>
            <Text style={styles.ownLabel}>{AUDIENCE_COPY[aboutYouAudience].label}</Text>
            <Text style={styles.ownHint}>{PROFILE_EDITOR_COPY.ownAudienceHint}</Text>
          </View>
          <TouchableOpacity onPress={() => setPickerOpen(true)} hitSlop={8} accessibilityRole="button">
            <Text style={styles.link}>{PROFILE_EDITOR_COPY.change}</Text>
          </TouchableOpacity>
        </View>
      )}

      {ownPicker && (
        <View style={styles.block}>
          <View style={styles.headerRow}>
            <Text style={styles.subheading}>{PROFILE_EDITOR_COPY.placeQuestion}</Text>
            {/* Only once this place differs from About you — the same
                "Reset after a change" rule as the Advanced levels. */}
            {!following && (
              <TouchableOpacity
                onPress={() => onChange(withPlaceAudience(profile, aboutYouAudience, aboutYouAudience))}
                hitSlop={8}
                accessibilityRole="button"
              >
                <Text style={styles.link}>{PROFILE_EDITOR_COPY.reset}</Text>
              </TouchableOpacity>
            )}
          </View>
          {audiencePicker}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  question: { fontSize: 17, fontWeight: '700', color: '#222', marginTop: 12 },
  segment: { marginTop: 12 },
  block: { marginTop: 18 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  subheading: {
    fontSize: 12,
    fontWeight: '700',
    color: '#777',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  hint: { fontSize: 12, lineHeight: 17, color: ALERT_UI.mutedTextColor, marginTop: 6 },
  ownCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: ALERT_UI.optionBorderColor,
    borderRadius: ALERT_UI.optionRadius,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  ownText: { flex: 1 },
  ownLabel: { fontSize: 15, fontWeight: '600', color: '#333' },
  ownHint: { fontSize: 12, color: ALERT_UI.mutedTextColor, marginTop: 3 },
  link: { fontSize: 13, fontWeight: '600', color: ALERT_UI.accentColor },
});

export default PlaceAudienceSection;
