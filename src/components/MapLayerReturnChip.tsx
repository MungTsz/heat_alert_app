// src/components/MapLayerReturnChip.tsx
import React from 'react';
import { Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MAP_LAYER_COPY } from '../config/alertCopy';
import { MAP_LAYER_RETURN_CHIP_CONFIG as C } from '../config/mapLayerConfig';
import { MapLayer } from '../types/mapSettings';

type Props = {
  // The detail layer on screen ('heat' or 'aqhi').
  layer: MapLayer;
  onPress: () => void;
};

// "Heat index · ← Environmental Index": says which detail layer is up and
// takes the user back to the index in one tap, so a detail layer never
// feels like a place the user can get lost in.
const MapLayerReturnChip: React.FC<Props> = ({ layer, onPress }) => (
  <TouchableOpacity
    style={styles.chip}
    onPress={onPress}
    activeOpacity={0.8}
    accessibilityRole="button"
    accessibilityLabel={MAP_LAYER_COPY.returnChipLabel}
  >
    <Text style={styles.text} numberOfLines={1}>
      {MAP_LAYER_COPY.returnChip(MAP_LAYER_COPY.layerNames[layer])}
    </Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  chip: {
    minHeight: C.minTouchSize,
    minWidth: C.minTouchSize,
    borderRadius: C.minTouchSize / 2,
    paddingHorizontal: C.paddingHorizontal,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
  },
  text: { fontSize: C.fontSize, fontWeight: '700', color: '#222' },
});

export default MapLayerReturnChip;
