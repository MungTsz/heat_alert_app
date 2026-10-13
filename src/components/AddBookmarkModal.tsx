// src/components/AddBookmarkModal.tsx
import React, { useState } from 'react';
import { Modal, View, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BookmarkEntry, PlaceCategory } from '../types/bookmark';
import { PLACE_LABEL_CONFIG } from '../config/placeLabelConfig';
import PlaceCategoryStep from './addPlace/PlaceCategoryStep';
import MapPickerModal, { PickedPlace } from './MapPickerModal';

type Coordinates = { latitude: number; longitude: number };

type Props = {
  visible: boolean;
  onClose: () => void;
  existingPlaces: readonly BookmarkEntry[];
  currentLocation: Coordinates | null;
  onAdd: (place: Omit<BookmarkEntry, 'id' | 'updatedAt'>) => void;
};

type Step = 'category' | 'location';

// Two focused steps, most important first: (1) what kind of place — the
// data the exposure API uses, (2) where it is and how big, on a map. The
// name is generated from the location, so nothing has to be typed.
const AddBookmarkModal = ({ visible, onClose, existingPlaces, currentLocation, onAdd }: Props) => {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<Step>('category');
  const [category, setCategory] = useState<PlaceCategory | null>(null);

  const resetAndClose = () => {
    setStep('category');
    setCategory(null);
    onClose();
  };

  const handleConfirm = (place: PickedPlace) => {
    if (!category) return;
    onAdd({
      label: place.label,
      address: place.address,
      latitude: place.latitude,
      longitude: place.longitude,
      radiusMeters: place.radiusMeters,
      category,
    });
    resetAndClose();
  };

  return (
    <>
      <Modal
        visible={visible && step === 'category'}
        animationType="slide"
        transparent
        onRequestClose={resetAndClose}
        statusBarTranslucent
      >
        <View style={styles.overlay}>
          <TouchableOpacity
            style={styles.backdropTapArea}
            activeOpacity={1}
            onPress={resetAndClose}
          />
          <View style={[styles.sheet, { paddingBottom: 24 + insets.bottom }]}>
            <PlaceCategoryStep
              selected={category}
              onSelect={setCategory}
              onNext={() => setStep('location')}
              onCancel={resetAndClose}
            />
          </View>
        </View>
      </Modal>

      {/* Mounted only for this step so every visit starts fresh (default
          radius, pin at the current location, no leftover custom name). */}
      {visible && step === 'location' && category && (
        <MapPickerModal
          visible
          initialCenter={currentLocation ?? PLACE_LABEL_CONFIG.fallbackCenter}
          category={category}
          otherPlaces={existingPlaces}
          onBack={() => setStep('category')}
          onConfirm={handleConfirm}
        />
      )}
    </>
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
});

export default AddBookmarkModal;
