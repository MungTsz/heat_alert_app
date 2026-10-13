// src/components/addPlace/PlaceCategoryStep.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { EXPOSURE_IO_CONFIG } from '../../config/exposureIoConfig';
import { PlaceCategory } from '../../types/bookmark';
import StepDots from './StepDots';
import PlaceCategoryPicker from './PlaceCategoryPicker';
import InfoNote from './InfoNote';

type Props = {
  selected: PlaceCategory | null;
  onSelect: (category: PlaceCategory) => void;
  onNext: () => void;
  onCancel: () => void;
};

const TOTAL_STEPS = 2;

// Step 1 of Add place: the category is the one piece of data the exposure
// API actually uses, so it gets a screen to itself, is never preselected,
// and needs an explicit Next — tapping a tile only selects it, so a mis-tap
// can be corrected before it counts.
const PlaceCategoryStep: React.FC<Props> = ({ selected, onSelect, onNext, onCancel }) => {
  const selectedColor = selected ? EXPOSURE_IO_CONFIG[selected].color : undefined;

  return (
    <View>
      <StepDots current={1} total={TOTAL_STEPS} />
      <Text style={styles.title}>What kind of place is this?</Text>

      <PlaceCategoryPicker selected={selected} onSelect={onSelect} />

      <InfoNote>The place type helps us calculate your heat exposure more accurately.</InfoNote>

      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.nextButton,
            selectedColor ? { backgroundColor: selectedColor } : styles.nextButtonDisabled,
          ]}
          onPress={onNext}
          disabled={!selected}
        >
          <Text style={styles.nextText}>Next</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  title: { fontSize: 19, fontWeight: 'bold', color: '#222', marginTop: 10, marginBottom: 16 },
  buttonRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 18 },
  cancelButton: { paddingVertical: 12, paddingHorizontal: 18 },
  cancelText: { color: '#888', fontWeight: '600' },
  nextButton: {
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 28,
    alignItems: 'center',
  },
  nextButtonDisabled: { backgroundColor: '#C9C9C9' },
  nextText: { color: '#fff', fontWeight: '700' },
});

export default PlaceCategoryStep;
