// src/components/addPlace/PlaceCategoryStep.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Info } from 'lucide-react-native';
import { PLACE_CATEGORIES, PLACE_CATEGORY_CONFIG } from '../../config/placeCategoryConfig';
import { EXPOSURE_IO_CONFIG } from '../../config/exposureIoConfig';
import { PlaceCategory } from '../../types/bookmark';
import StepDots from './StepDots';

type Props = {
  selected: PlaceCategory | null;
  onSelect: (category: PlaceCategory) => void;
  onNext: () => void;
  onCancel: () => void;
};

const TOTAL_STEPS = 2;
const TILE_ICON_SIZE = 34;

// Step 1 of Add place: the category is the one piece of data the exposure
// API actually uses, so it gets a screen to itself, is never preselected,
// and needs an explicit Next — tapping a tile only selects it, so a mis-tap
// can be corrected before it counts.
const PlaceCategoryStep: React.FC<Props> = ({ selected, onSelect, onNext, onCancel }) => {
  const selectedConfig = selected ? PLACE_CATEGORY_CONFIG[selected] : null;
  const selectedColor = selected ? EXPOSURE_IO_CONFIG[selected].color : undefined;

  return (
    <View>
      <StepDots current={1} total={TOTAL_STEPS} />
      <Text style={styles.title}>What kind of place is this?</Text>

      <View style={styles.grid}>
        {PLACE_CATEGORIES.map(category => {
          const { Icon, label } = PLACE_CATEGORY_CONFIG[category];
          const color = EXPOSURE_IO_CONFIG[category].color;
          const isSelected = category === selected;
          return (
            <TouchableOpacity
              key={category}
              style={[
                styles.tile,
                isSelected && { borderColor: color, backgroundColor: color },
              ]}
              onPress={() => onSelect(category)}
              activeOpacity={0.8}
              accessibilityRole="radio"
              accessibilityLabel={label}
              accessibilityState={{ selected: isSelected }}
            >
              <Icon size={TILE_ICON_SIZE} color={isSelected ? '#fff' : color} />
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Revealed only after a tap, so the user reads what the icon they
          chose actually means before confirming it. */}
      {selectedConfig && selectedColor && (
        <View style={[styles.selectedCard, { borderLeftColor: selectedColor }]}>
          <selectedConfig.Icon size={20} color={selectedColor} />
          <View style={styles.selectedTextBox}>
            <Text style={styles.selectedLabel}>{selectedConfig.label}</Text>
            <Text style={styles.selectedDescription}>{selectedConfig.description}</Text>
          </View>
        </View>
      )}

      <View style={styles.infoBox}>
        <Info size={16} color="#3B6FB6" />
        <Text style={styles.infoText}>
          The place type helps us calculate your heat exposure more accurately.
        </Text>
      </View>

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
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 },
  tile: {
    width: '48%',
    aspectRatio: 1.6,
    borderWidth: 2,
    borderColor: '#E4E4E4',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FAFAFA',
  },
  selectedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderLeftWidth: 4,
    backgroundColor: '#F5F6F8',
  },
  selectedTextBox: { flex: 1 },
  selectedLabel: { fontSize: 16, fontWeight: '700', color: '#222' },
  selectedDescription: { fontSize: 13, color: '#666', marginTop: 2 },
  infoBox: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#EEF4FC',
  },
  infoText: { flex: 1, fontSize: 13, lineHeight: 18, color: '#2D4F80' },
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
