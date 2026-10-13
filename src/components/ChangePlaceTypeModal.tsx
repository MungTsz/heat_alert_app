// src/components/ChangePlaceTypeModal.tsx
import React, { useState } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TriangleAlert } from 'lucide-react-native';
import { BookmarkEntry, PlaceCategory } from '../types/bookmark';
import { EXPOSURE_IO_CONFIG } from '../config/exposureIoConfig';
import { PLACE_LABEL_CONFIG } from '../config/placeLabelConfig';
import { findConflictingPlaces } from '../utils/placeOverlap';
import PlaceCategoryPicker from './addPlace/PlaceCategoryPicker';
import InfoNote from './addPlace/InfoNote';

// Mount with key={place.id} while open, unmount to close — the selection
// then always starts from that place's current category.
type Props = {
  place: BookmarkEntry;
  // Every OTHER place — checked for overlap under the new category.
  otherPlaces: readonly BookmarkEntry[];
  onSave: (category: PlaceCategory) => void;
  onCancel: () => void;
};

// Re-labels an existing place with the same tiles used to add one. The
// place's name is left alone even if it was generated from the old type:
// renaming silently would surprise the user, and the card's ✎ is right there.
const ChangePlaceTypeModal: React.FC<Props> = ({ place, otherPlaces, onSave, onCancel }) => {
  const insets = useSafeAreaInsets();
  const [selected, setSelected] = useState<PlaceCategory>(place.category);

  const changed = selected !== place.category;
  const color = EXPOSURE_IO_CONFIG[selected].color;
  // A new category can turn a harmless same-type overlap into one the
  // backend can't resolve — say so here, since there's no map to fix it on.
  const conflict = changed
    ? findConflictingPlaces({ ...place, category: selected }, otherPlaces)[0]
    : undefined;

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onCancel} statusBarTranslucent>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdropTapArea} activeOpacity={1} onPress={onCancel} />
        <View style={[styles.sheet, { paddingBottom: 24 + insets.bottom }]}>
          <Text style={styles.title}>Change place type</Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {place.label}
          </Text>

          <PlaceCategoryPicker selected={selected} onSelect={setSelected} />

          {conflict && (
            <View style={styles.warning}>
              <TriangleAlert size={16} color={PLACE_LABEL_CONFIG.conflictStrokeColor} />
              <Text style={styles.warningText}>
                Its area now overlaps "{conflict.place.label}" ({conflict.place.category}) — stays
                in the overlap can't be told apart.
              </Text>
            </View>
          )}

          {/* The backend only applies labels to uploads processed after the
              change, so set that expectation up front. */}
          <InfoNote>
            Exposure recorded from now on uses the new type. Earlier days stay as they were.
          </InfoNote>

          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveButton, changed ? { backgroundColor: color } : styles.saveDisabled]}
              onPress={() => onSave(selected)}
              disabled={!changed}
            >
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
  subtitle: { fontSize: 14, color: '#777', marginTop: 2, marginBottom: 16 },
  warning: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#FDECEC',
  },
  warningText: { flex: 1, fontSize: 12, lineHeight: 17, color: '#8A2B28' },
  buttonRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 18 },
  cancelButton: { paddingVertical: 12, paddingHorizontal: 18 },
  cancelText: { color: '#888', fontWeight: '600' },
  saveButton: { borderRadius: 10, paddingVertical: 12, paddingHorizontal: 28 },
  saveDisabled: { backgroundColor: '#C9C9C9' },
  saveText: { color: '#fff', fontWeight: '700' },
});

export default ChangePlaceTypeModal;
