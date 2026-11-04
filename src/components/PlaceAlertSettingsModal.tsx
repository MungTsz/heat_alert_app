// src/components/PlaceAlertSettingsModal.tsx
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
import { BookmarkEntry } from '../types/bookmark';
import { PlaceAlertProfile } from '../types/alerts';
import { PROFILE_EDITOR_COPY } from '../config/alertCopy';
import { ALERT_UI } from '../config/alertUiConfig';
import { resolveAlertProfile } from '../utils/alertProfile';
import AlertProfileEditor from './alerts/AlertProfileEditor';
import InfoNote from './addPlace/InfoNote';

// Mount with key={place.id} while open, unmount to close — edits then
// always start from that place's saved profile.
type Props = {
  place: BookmarkEntry;
  onSave: (profile: PlaceAlertProfile) => void;
  onCancel: () => void;
};

// Per-place "when is it dangerous" settings, opened from a place card.
const PlaceAlertSettingsModal: React.FC<Props> = ({ place, onSave, onCancel }) => {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const [profile, setProfile] = useState(() => resolveAlertProfile(place.alertProfile));

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onCancel} statusBarTranslucent>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdropTapArea} activeOpacity={1} onPress={onCancel} />
        <View style={[styles.sheet, { paddingBottom: 24 + insets.bottom }]}>
          <Text style={styles.title}>{PROFILE_EDITOR_COPY.sheetTitle}</Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {place.label}
          </Text>

          <ScrollView style={{ maxHeight: height * ALERT_UI.sheetScrollMaxHeightRatio }}>
            <AlertProfileEditor
              profile={profile}
              onChange={setProfile}
              question={PROFILE_EDITOR_COPY.placeQuestion}
              showCaringFor
            />
            {/* "Long-term condition" is health information — say plainly
                where it goes. */}
            <InfoNote>{PROFILE_EDITOR_COPY.privacyNote}</InfoNote>
          </ScrollView>

          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveButton} onPress={() => onSave(profile)}>
              <Text style={styles.saveText}>Save</Text>
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
    padding: 24,
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

export default PlaceAlertSettingsModal;
