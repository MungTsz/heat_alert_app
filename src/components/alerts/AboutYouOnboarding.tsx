// src/components/alerts/AboutYouOnboarding.tsx
import React, { useState } from 'react';
import { Modal, View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AudienceGroup } from '../../types/alerts';
import { ONBOARDING_COPY, PROFILE_EDITOR_COPY } from '../../config/alertCopy';
import { ALERT_UI } from '../../config/alertUiConfig';
import { useNotificationSettings } from '../../hooks/useNotificationSettings';
import AudiencePicker from './AudiencePicker';
import InfoNote from '../addPlace/InfoNote';

// Asked once, on first launch: who the phone's owner is decides when alerts
// for their own location arrive, and it rarely changes — so it is a
// one-time question here rather than an always-open form in Settings.
// Only the audience is asked; hazards and Advanced levels keep their
// defaults and live behind Settings → About you.
const AboutYouOnboarding = () => {
  const { settings, loading, update } = useNotificationSettings();
  // Local until Continue, so nothing is saved half-answered.
  const [audience, setAudience] = useState<AudienceGroup | null>(null);
  const visible = !loading && !settings.aboutYouConfirmed;
  const chosen = audience ?? settings.currentLocationProfile.audience;

  const confirm = () =>
    update({
      currentLocationProfile: { ...settings.currentLocationProfile, audience: chosen },
      aboutYouConfirmed: true,
    });

  return (
    // No onRequestClose dismissal: Android back must not skip the one
    // question; Continue always works since a default is preselected.
    <Modal visible={visible} animationType="fade" onRequestClose={() => {}} statusBarTranslucent>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.eyebrow}>{ONBOARDING_COPY.eyebrow}</Text>
          <Text style={styles.title}>{ONBOARDING_COPY.title}</Text>
          <Text style={styles.intro}>{ONBOARDING_COPY.intro}</Text>

          <Text style={styles.question}>{PROFILE_EDITOR_COPY.selfQuestion}</Text>
          <AudiencePicker value={chosen} onChange={setAudience} />

          <InfoNote>{PROFILE_EDITOR_COPY.privacyNote}</InfoNote>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.continueButton} onPress={confirm} accessibilityRole="button">
            <Text style={styles.continueText}>{ONBOARDING_COPY.continue}</Text>
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
  question: { fontSize: 17, fontWeight: '700', color: '#222', marginTop: 28 },
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
