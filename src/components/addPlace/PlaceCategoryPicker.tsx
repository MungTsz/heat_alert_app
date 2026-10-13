// src/components/addPlace/PlaceCategoryPicker.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { PLACE_CATEGORIES, PLACE_CATEGORY_CONFIG } from '../../config/placeCategoryConfig';
import { EXPOSURE_IO_CONFIG } from '../../config/exposureIoConfig';
import { PlaceCategory } from '../../types/bookmark';

type Props = {
  selected: PlaceCategory | null;
  onSelect: (category: PlaceCategory) => void;
};

const TILE_ICON_SIZE = 34;

// The 2×2 icon tiles shared by Add place (step 1) and Change place type, so
// a category looks and reads the same wherever it's chosen.
const PlaceCategoryPicker: React.FC<Props> = ({ selected, onSelect }) => {
  const selectedConfig = selected ? PLACE_CATEGORY_CONFIG[selected] : null;
  const selectedColor = selected ? EXPOSURE_IO_CONFIG[selected].color : undefined;

  return (
    <View>
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

      {/* Spells out what the selected icon means, so the user reads it
          before confirming — a wrong category feeds a wrong io type to the
          exposure API. */}
      {selectedConfig && selectedColor && (
        <View style={[styles.selectedCard, { borderLeftColor: selectedColor }]}>
          <selectedConfig.Icon size={20} color={selectedColor} />
          <View style={styles.selectedTextBox}>
            <Text style={styles.selectedLabel}>{selectedConfig.label}</Text>
            <Text style={styles.selectedDescription}>{selectedConfig.description}</Text>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
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
});

export default PlaceCategoryPicker;
