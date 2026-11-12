// src/components/alerts/AlertProfileSheet.tsx
import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AudienceGroup, PlaceAlertProfile } from '../../types/alerts';
import { PROFILE_EDITOR_COPY } from '../../config/alertCopy';
import { ALERT_UI } from '../../config/alertUiConfig';
import AlertProfileEditor from './AlertProfileEditor';
import InfoNote from '../addPlace/InfoNote';

// Mount while open and unmount to close (with a key per place), so edits
// always start from the saved profile and Cancel simply discards them.
type Props = {
  title: string;
  subtitle?: string;
  // See AlertProfileEditor: set for a place, absent for About you.
  forPlace?: { aboutYouAudience: AudienceGroup };
  initialProfile: PlaceAlertProfile;
  onSave: (profile: PlaceAlertProfile) => void;
  onCancel: () => void;
};

// "When is it dangerous here" as a bottom sheet with Save / Cancel — for a
// saved place (opened from its Places card) and for "About you" (opened from
// its row on the Alerts tab). That tab stays a list of short rows; the full
// editor only appears when someone actually means to change it.
const AlertProfileSheet = ({
  title,
  subtitle,
  forPlace,
  initialProfile,
  onSave,
  onCancel,
}: Props) => {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const [profile, setProfile] = useState(initialProfile);

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onCancel} statusBarTranslucent>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdropTapArea} activeOpacity={1} onPress={onCancel} />
        <View style={[styles.sheet, { paddingBottom: 24 + insets.bottom }]}>
          <View style={styles.grabber} />
          <Text style={styles.title}>{title}</Text>
          {subtitle ? (
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}

          <ScrollView style={{ maxHeight: height * ALERT_UI.sheetScrollMaxHeightRatio }}>
            <AlertProfileEditor profile={profile} onChange={setProfile} forPlace={forPlace} />
            {/* "Long-term condition" is health information — say plainly
                where it goes. */}
            <InfoNote>{PROFILE_EDITOR_COPY.privacyNote}</InfoNote>
          </ScrollView>

          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
              <Text style={styles.cancelText}>{PROFILE_EDITOR_COPY.cancel}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveButton} onPress={() => onSave(profile)}>
              <Text style={styles.saveText}>{PROFILE_EDITOR_COPY.save}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  backdropTapArea: { flex: 1 },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 24,
    paddingTop: 10,
  },
  grabber: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#DDD',
    marginBottom: 14,
  },
  title: { fontSize: 19, fontWeight: 'bold', color: '#222' },
  subtitle: { fontSize: 14, color: '#777', marginTop: 2 },
  buttonRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 18 },
  cancelButton: { paddingVertical: 12, paddingHorizontal: 18 },
  cancelText: { color: ALERT_UI.mutedTextColor, fontWeight: '600' },
  saveButton: {
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 28,
    backgroundColor: ALERT_UI.accentColor,
  },
  saveText: { color: '#fff', fontWeight: '700' },
});

export default AlertProfileSheet;
