// src/components/MapPointCard.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ChevronDown, ChevronUp } from 'lucide-react-native';
import EnviLevelSquare from './EnviLevelSquare';
import HomeInfoBlock from './HomeInfoBlock';
import { readingBlocks, SpotReadings } from './readingBlocks';
import { ENVI_COPY, MAP_LAYER_COPY } from '../config/alertCopy';
import { MAP_POINT_CARD_CONFIG as C } from '../config/mapLayerConfig';
import { getEnviLevelInfo } from '../utils/enviUtils';
import { pinEnviLevel } from '../utils/enviMapLayer';

type Props = {
  readings: SpotReadings;
  expanded: boolean;
  onToggle: () => void;
};

// The tapped point on the Environmental Index layer: the index square and
// level name, and a "Details" button that opens the four readings there
// (the same blocks as Home's side bar, in their white tone). It sits under
// the map, outside MapView, on purpose: Android draws a custom Marker as a
// single bitmap, so a button inside the pin could never be tapped.
const MapPointCard: React.FC<Props> = ({ readings, expanded, onToggle }) => {
  const level = pinEnviLevel(readings);
  const name = level === null ? ENVI_COPY.unavailable : getEnviLevelInfo(level).name;
  return (
    <View style={styles.card}>
      <View
        style={styles.header}
        accessible
        accessibilityLabel={
          level === null
            ? MAP_LAYER_COPY.pointUnavailableLabel
            : MAP_LAYER_COPY.pointLevelLabel(level, name)
        }
      >
        <EnviLevelSquare level={level} tone="sheet" dimensions={C} />
        <View style={styles.titles}>
          <Text style={styles.title} numberOfLines={1}>
            {ENVI_COPY.title}
          </Text>
          <Text style={styles.levelName} numberOfLines={1}>
            {name}
          </Text>
        </View>
      </View>
      <TouchableOpacity
        style={styles.detailsButton}
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={
          expanded ? MAP_LAYER_COPY.pointHideDetailsLabel : MAP_LAYER_COPY.pointDetailsLabel
        }
      >
        <Text style={styles.detailsText}>
          {expanded ? MAP_LAYER_COPY.pointHideDetails : MAP_LAYER_COPY.pointDetails}
        </Text>
        {expanded ? (
          <ChevronUp size={C.detailsIconSize} color="#2B7A9E" />
        ) : (
          <ChevronDown size={C.detailsIconSize} color="#2B7A9E" />
        )}
      </TouchableOpacity>
      {expanded && (
        <View style={styles.blocks}>
          {readingBlocks(readings).map(block => (
            <HomeInfoBlock key={block.key} block={block} tone="sheet" />
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: C.radius,
    padding: C.padding,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    elevation: 5,
  },
  header: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  titles: { flexShrink: 1 },
  title: { fontSize: C.titleFontSize, fontWeight: '600', color: '#6B6B70' },
  levelName: { fontSize: C.levelNameFontSize, fontWeight: '800', color: '#1C1C1E' },
  detailsButton: {
    minHeight: C.minTouchSize,
    minWidth: C.minTouchSize,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingHorizontal: 6,
  },
  detailsText: { fontSize: C.detailsFontSize, fontWeight: '700', color: '#2B7A9E' },
  blocks: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: C.blockGap,
    marginTop: C.padding,
  },
});

export default MapPointCard;
