// src/components/addPlace/PlaceAudienceStep.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, useWindowDimensions } from 'react-native';
import { PlaceAlertProfile } from '../../types/alerts';
import { PROFILE_EDITOR_COPY } from '../../config/alertCopy';
import { ADD_PLACE_STEPS, ALERT_UI } from '../../config/alertUiConfig';
import AlertProfileEditor from '../alerts/AlertProfileEditor';
import StepDots from './StepDots';
import InfoNote from './InfoNote';

type Props = {
  profile: PlaceAlertProfile;
  onChange: (profile: PlaceAlertProfile) => void;
  onBack: () => void;
  onNext: () => void;
};

// Step 2 of Add place: the one alert question every place needs. It comes
// preselected as General adult (the design doc's default), so Next is
// always available — unlike the category step, a wrong guess here only
// changes when alerts arrive and is easy to fix from the card later.
const PlaceAudienceStep: React.FC<Props> = ({ profile, onChange, onBack, onNext }) => {
  const { height } = useWindowDimensions();
  return (
    <View>
      <StepDots current={ADD_PLACE_STEPS.audience} total={ADD_PLACE_STEPS.total} />

      <ScrollView style={{ maxHeight: height * ALERT_UI.sheetScrollMaxHeightRatio }}>
        <AlertProfileEditor
          profile={profile}
          onChange={onChange}
          question={PROFILE_EDITOR_COPY.placeQuestion}
          showCaringFor
        />
        <InfoNote>{PROFILE_EDITOR_COPY.privacyNote}</InfoNote>
      </ScrollView>

      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.nextButton} onPress={onNext}>
          <Text style={styles.nextText}>Next</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  buttonRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 18 },
  backButton: { paddingVertical: 12, paddingHorizontal: 18 },
  backText: { color: ALERT_UI.mutedTextColor, fontWeight: '600' },
  nextButton: {
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 28,
    alignItems: 'center',
    backgroundColor: ALERT_UI.accentColor,
  },
  nextText: { color: '#fff', fontWeight: '700' },
});

export default PlaceAudienceStep;
