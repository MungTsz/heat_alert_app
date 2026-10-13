// src/components/addPlace/PlaceRadiusSlider.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Slider from '@react-native-community/slider';
import { TriangleAlert } from 'lucide-react-native';
import { PLACE_LABEL_CONFIG } from '../../config/placeLabelConfig';
import { PLACE_CATEGORY_CONFIG } from '../../config/placeCategoryConfig';
import { PlaceCategory } from '../../types/bookmark';
import { PlaceConflict } from '../../utils/placeOverlap';

type Props = {
  radiusMeters: number;
  category: PlaceCategory;
  color: string;
  // Nearest overlapping place of another category, if any.
  conflict: PlaceConflict | null;
  onChange: (radiusMeters: number) => void;
  onChangeComplete: (radiusMeters: number) => void;
};

const PlaceRadiusSlider: React.FC<Props> = ({
  radiusMeters,
  category,
  color,
  conflict,
  onChange,
  onChangeComplete,
}) => {
  const { minM, maxM, stepM } = PLACE_LABEL_CONFIG.radius;
  const categoryLabel = PLACE_CATEGORY_CONFIG[category].label;

  return (
    <View>
      <View style={styles.headerRow}>
        <Text style={styles.label}>Area</Text>
        <Text style={[styles.value, { color }]}>{radiusMeters} m</Text>
      </View>
      <Slider
        style={styles.slider}
        minimumValue={minM}
        maximumValue={maxM}
        step={stepM}
        value={radiusMeters}
        onValueChange={onChange}
        onSlidingComplete={onChangeComplete}
        minimumTrackTintColor={color}
        maximumTrackTintColor="#DDD"
        thumbTintColor={color}
      />
      <Text style={styles.help}>
        The circle is the area that counts as {categoryLabel}. Shrink it if another place is
        close by.
      </Text>

      {conflict && (
        <View style={styles.warning}>
          <TriangleAlert size={16} color={PLACE_LABEL_CONFIG.conflictStrokeColor} />
          <View style={styles.warningBody}>
            {conflict.maxNonOverlappingRadiusM !== null ? (
              <>
                <Text style={styles.warningText}>
                  Overlaps "{conflict.place.label}" — stays in the overlap can't be told apart.
                </Text>
                <TouchableOpacity
                  onPress={() => onChangeComplete(conflict.maxNonOverlappingRadiusM as number)}
                >
                  <Text style={[styles.shrinkText, { color }]}>
                    Shrink to {conflict.maxNonOverlappingRadiusM} m
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <Text style={styles.warningText}>
                Too close to "{conflict.place.label}" to separate — that's OK if they're in the
                same building.
              </Text>
            )}
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  label: { fontSize: 13, fontWeight: '600', color: '#555' },
  value: { fontSize: 15, fontWeight: '700' },
  slider: { width: '100%', height: 36 },
  help: { fontSize: 12, lineHeight: 17, color: '#777' },
  warning: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#FDECEC',
  },
  warningBody: { flex: 1 },
  warningText: { fontSize: 12, lineHeight: 17, color: '#8A2B28' },
  shrinkText: { fontSize: 13, fontWeight: '700', marginTop: 6 },
});

export default PlaceRadiusSlider;
