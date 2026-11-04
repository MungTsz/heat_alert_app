// src/components/AddBookmarkModal.tsx
import React, { useState } from 'react';
import { Modal, View, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BookmarkEntry, PlaceCategory } from '../types/bookmark';
import { PlaceAlertProfile } from '../types/alerts';
import { PLACE_LABEL_CONFIG } from '../config/placeLabelConfig';
import { DEFAULT_PLACE_ALERT_PROFILE } from '../config/alertConfig';
import PlaceCategoryStep from './addPlace/PlaceCategoryStep';
import PlaceAudienceStep from './addPlace/PlaceAudienceStep';
import MapPickerModal, { PickedPlace } from './MapPickerModal';

type Coordinates = { latitude: number; longitude: number };

type Props = {
  visible: boolean;
  onClose: () => void;
  existingPlaces: readonly BookmarkEntry[];
  currentLocation: Coordinates | null;
  // Where the map step opens instead of the current location — e.g. a stay
  // dot tapped on the exposure map, so the pin starts on that spot.
  initialCenter?: Coordinates;
  onAdd: (place: Omit<BookmarkEntry, 'id' | 'updatedAt'>) => void;
};

type Step = 'category' | 'audience' | 'location';

// Three focused steps, most important first: (1) what kind of place — the
// data the exposure API uses, (2) who is mainly there — what alerts use,
// (3) where it is and how big, on a map. The name is generated from the
// location, so nothing has to be typed.
const AddBookmarkModal = ({
  visible,
  onClose,
  existingPlaces,
  currentLocation,
  initialCenter,
  onAdd,
}: Props) => {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<Step>('category');
  const [category, setCategory] = useState<PlaceCategory | null>(null);
  const [alertProfile, setAlertProfile] = useState<PlaceAlertProfile>(DEFAULT_PLACE_ALERT_PROFILE);

  const resetAndClose = () => {
    setStep('category');
    setCategory(null);
    setAlertProfile(DEFAULT_PLACE_ALERT_PROFILE);
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
      alertProfile,
    });
    resetAndClose();
  };

  const sheetStep = step === 'category' || step === 'audience';

  return (
    <>
      <Modal
        visible={visible && sheetStep}
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
            {step === 'category' ? (
              <PlaceCategoryStep
                selected={category}
                onSelect={setCategory}
                onNext={() => setStep('audience')}
                onCancel={resetAndClose}
              />
            ) : (
              <PlaceAudienceStep
                profile={alertProfile}
                onChange={setAlertProfile}
                onBack={() => setStep('category')}
                onNext={() => setStep('location')}
              />
            )}
          </View>
        </View>
      </Modal>

      {/* Mounted only for this step so every visit starts fresh (default
          radius, pin at the current location, no leftover custom name). */}
      {visible && step === 'location' && category && (
        <MapPickerModal
          visible
          initialCenter={initialCenter ?? currentLocation ?? PLACE_LABEL_CONFIG.fallbackCenter}
          category={category}
          otherPlaces={existingPlaces}
          onBack={() => setStep('audience')}
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
