// src/components/alerts/AboutYouOnboarding.tsx
import React, { useState } from 'react';
import { Modal, View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AlertPerson } from '../../types/alerts';
import { ONBOARDING_COPY, PROFILE_EDITOR_COPY } from '../../config/alertCopy';
import { ALERT_UI } from '../../config/alertUiConfig';
import { useNotificationSettings } from '../../hooks/useNotificationSettings';
import { personOf, withoutReview } from '../../utils/alertProfile';
import AlertPersonQuestions from './AlertPersonQuestions';
import InfoNote from '../addPlace/InfoNote';

// Asked once, on first launch: who the phone's owner is decides when alerts
// for their own location arrive, and it rarely changes — so it is a
// one-time set of questions here rather than an always-open form in the
// Alerts tab. Only the three About you questions are asked; hazards and
// Advanced levels keep their defaults and live behind Alerts → About you.
// Shown once more, as "Please check your details", to someone whose old
// one-choice answer was converted with a guess (needsReview).
const AboutYouOnboarding = () => {
  const { settings, loading, update } = useNotificationSettings();
  const profile = settings.currentLocationProfile;
  // Local until Continue, so nothing is saved half-answered.
  const [draft, setDraft] = useState<AlertPerson | null>(null);
  const review = profile.needsReview === true;
  const visible = !loading && (!settings.aboutYouConfirmed || review);
  const person = draft ?? personOf(profile);

  const confirm = () =>
    update({
      currentLocationProfile: withoutReview({ ...profile, ...person }),
      aboutYouConfirmed: true,
    });

  return (
    // No onRequestClose dismissal: Android back must not skip the
    // questions; Continue always works since every question has an answer.
    <Modal visible={visible} animationType="fade" onRequestClose={() => {}} statusBarTranslucent>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.eyebrow}>
            {review ? ONBOARDING_COPY.reviewEyebrow : ONBOARDING_COPY.eyebrow}
          </Text>
          <Text style={styles.title}>
            {review ? ONBOARDING_COPY.reviewTitle : ONBOARDING_COPY.title}
          </Text>
          <Text style={styles.intro}>
            {review ? ONBOARDING_COPY.reviewIntro : ONBOARDING_COPY.intro}
          </Text>

          <View style={styles.questions}>
            <AlertPersonQuestions voice="self" person={person} onChange={setDraft} />
          </View>

          <InfoNote>{PROFILE_EDITOR_COPY.privacyNote}</InfoNote>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.continueButton} onPress={confirm} accessibilityRole="button">
            <Text style={styles.continueText}>
              {review ? ONBOARDING_COPY.reviewContinue : ONBOARDING_COPY.continue}
            </Text>
          </TouchableOpacity>
          <Text style={styles.laterHint}>{ONBOARDING_COPY.laterHint}</Text>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  content: { paddingHorizontal: 24, paddingTop: 32, paddingBottom: 16 },
  eyebrow: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    color: ALERT_UI.accentColor,
  },
  title: { fontSize: 28, fontWeight: '800', color: '#222', marginTop: 6 },
  intro: { fontSize: 15, lineHeight: 22, color: '#555', marginTop: 10 },
  questions: { marginTop: 16 },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 20,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: ALERT_UI.optionBorderColor,
  },
  continueButton: {
    backgroundColor: ALERT_UI.accentColor,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
  },
  continueText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  laterHint: {
    fontSize: 12,
    color: ALERT_UI.mutedTextColor,
    textAlign: 'center',
    marginTop: 10,
  },
});

export default AboutYouOnboarding;
