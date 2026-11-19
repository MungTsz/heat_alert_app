// src/components/alerts/PlaceAudienceSection.tsx
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { AlertPerson, CaringFor, PlaceAlertProfile } from '../../types/alerts';
import { CARING_FOR_COPY, PROFILE_EDITOR_COPY } from '../../config/alertCopy';
import { ALERT_UI } from '../../config/alertUiConfig';
import {
  summarizeDailyLife,
  summarizeIdentities,
  withCaringFor,
  withPlacePerson,
} from '../../utils/alertProfile';
import SegmentedControl from '../SegmentedControl';
import AlertPersonQuestions from './AlertPersonQuestions';

type Props = {
  profile: PlaceAlertProfile;
  onChange: (profile: PlaceAlertProfile) => void;
  // The owner's About you answers — what a place for yourself uses.
  aboutYou: AlertPerson;
};

const CARING_FOR_OPTIONS: { value: CaringFor; label: string }[] = [
  { value: 'self', label: CARING_FOR_COPY.self },
  { value: 'family', label: CARING_FOR_COPY.family },
];

// "Who is this place for?" first, because it decides whether there is
// anything left to ask: who the owner is was answered once at first launch,
// so a place for yourself just shows those answers (changeable, for a home
// shared with someone who needs more care). Only a place for someone else
// opens the full questions.
const PlaceAudienceSection = ({ profile, onChange, aboutYou }: Props) => {
  const following = profile.caringFor === 'self' && profile.followsAboutYou === true;
  // Open from the start when this place already has its own answers, so
  // they are never hidden from the person who chose them.
  const [questionsOpen, setQuestionsOpen] = useState(!following);
  const ownQuestions = profile.caringFor === 'self' && (questionsOpen || !following);

  const questions = (
    <AlertPersonQuestions
      voice="place"
      person={profile}
      onChange={person => onChange(withPlacePerson(profile, person, aboutYou))}
    />
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
            if (caringFor === 'self') setQuestionsOpen(false);
            onChange(withCaringFor(profile, caringFor, aboutYou));
          }}
        />
      </View>

      {profile.caringFor === 'family' && (
        <View style={styles.block}>
          {questions}
          <Text style={styles.hint}>{PROFILE_EDITOR_COPY.familyHint}</Text>
        </View>
      )}

      {profile.caringFor === 'self' && !ownQuestions && (
        <View style={styles.ownCard}>
          <View style={styles.ownText}>
            <Text style={styles.ownLabel}>{summarizeIdentities(aboutYou.identities)}</Text>
            <Text style={styles.ownDetail}>{summarizeDailyLife(aboutYou)}</Text>
            <Text style={styles.ownHint}>{PROFILE_EDITOR_COPY.ownAudienceHint}</Text>
          </View>
          <TouchableOpacity
            onPress={() => setQuestionsOpen(true)}
            hitSlop={8}
            accessibilityRole="button"
          >
            <Text style={styles.link}>{PROFILE_EDITOR_COPY.change}</Text>
          </TouchableOpacity>
        </View>
      )}

      {ownQuestions && (
        <View style={styles.block}>
          <View style={styles.headerRow}>
            <Text style={styles.subheading}>{PROFILE_EDITOR_COPY.ownAnswersTitle}</Text>
            {/* Only once this place differs from About you — the same
                "Reset after a change" rule as the Advanced levels. */}
            {!following && (
              <TouchableOpacity
                onPress={() => onChange(withPlacePerson(profile, aboutYou, aboutYou))}
                hitSlop={8}
                accessibilityRole="button"
              >
                <Text style={styles.link}>{PROFILE_EDITOR_COPY.reset}</Text>
              </TouchableOpacity>
            )}
          </View>
          {questions}
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
  hint: { fontSize: 12, lineHeight: 17, color: ALERT_UI.mutedTextColor, marginTop: 10 },
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
  ownDetail: { fontSize: 13, color: '#555', marginTop: 2 },
  ownHint: { fontSize: 12, color: ALERT_UI.mutedTextColor, marginTop: 3 },
  link: { fontSize: 13, fontWeight: '600', color: ALERT_UI.accentColor },
});

export default PlaceAudienceSection;
