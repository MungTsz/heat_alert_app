// src/components/EnviBand.tsx
import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import Svg, { Polygon } from 'react-native-svg';
import { ENVI_COPY } from '../config/alertCopy';
import { ENVI_BAND_CONFIG, ENVI_LEVELS, ENVI_TONES, EnviTone } from '../config/enviConfig';
import { EnviMarker, EnviMarkerAlign, enviBandMarkers } from '../utils/enviBandMarkers';

type Props = {
  // 1-5, or null while there is no reading (band faded, no arrows).
  level: number | null;
  // Today's peak level from utils/enviPeak (null = no dashed arrow).
  peakLevel: number | null;
  tone: EnviTone;
};

const {
  cellHeight,
  cellGap,
  cellRadius,
  inactiveOpacity,
  arrowWidth,
  arrowHeight,
  arrowStrokeWidth,
  peakArrowDash,
  markerLabelHeight,
  markerLabelFontSize,
  markerLabelMaxWidth,
} = ENVI_BAND_CONFIG;

// Places a marker label's box against its own cell (see enviBandMarkers for
// when each is used). Percentages are of the cell, so '50%' is the arrow.
const ALIGN_STYLE: Record<EnviMarkerAlign, ViewStyle> = {
  center: { left: '50%', marginLeft: -markerLabelMaxWidth / 2, alignItems: 'center' },
  endAtArrow: { right: '50%', alignItems: 'flex-end' },
  startAtArrow: { left: '50%', alignItems: 'flex-start' },
  cellStart: { left: 0, alignItems: 'flex-start' },
  cellEnd: { right: 0, alignItems: 'flex-end' },
};

// "Now" is a solid ▼, "Today's peak" a dashed ▽, so the two read apart
// even without their labels.
const Arrow: React.FC<{ solid: boolean; color: string }> = ({ solid, color }) => {
  const inset = arrowStrokeWidth / 2; // keeps the stroke inside the canvas
  const points = `${inset},${inset} ${arrowWidth - inset},${inset} ${arrowWidth / 2},${arrowHeight - inset}`;
  return (
    <Svg width={arrowWidth} height={arrowHeight}>
      <Polygon
        points={points}
        fill={solid ? color : 'none'}
        stroke={color}
        strokeWidth={arrowStrokeWidth}
        strokeDasharray={solid ? undefined : peakArrowDash}
        strokeLinejoin="round"
      />
    </Svg>
  );
};

// The five Environmental Index levels as one band: the current level solid
// in the level square's colour, the rest faded, with a "Now" arrow above it
// and, when today will get worse, a "Today's peak" arrow.
// Deliberately only the overall level: no heat index or AQHI markers,
// because how the level is worked out is not shown to the user.
const EnviBand: React.FC<Props> = ({ level, peakLevel, tone }) => {
  const colors = ENVI_TONES[tone];
  const markers = enviBandMarkers(level, peakLevel);
  const markerAt = (cellLevel: number): EnviMarker | undefined =>
    markers.find(marker => marker.level === cellLevel);

  return (
    // The card and the sheet read the level out themselves, so the band is
    // decoration to a screen reader.
    <View accessible={false} importantForAccessibility="no-hide-descendants">
      {/* Always laid out, even with nothing to point at, so the card keeps
          its height when the first reading arrives. */}
      <View style={styles.markerRow}>
        {ENVI_LEVELS.map(item => {
          const marker = markerAt(item.level);
          const isNow = marker?.kind === 'now';
          return (
            <View key={item.level} style={styles.markerCell}>
              {marker && (
                <>
                  <View style={[styles.labelBox, ALIGN_STYLE[marker.align]]}>
                    <Text
                      numberOfLines={1}
                      style={[styles.label, { color: isNow ? colors.marker : colors.mutedText }]}
                    >
                      {isNow ? ENVI_COPY.nowMarker : ENVI_COPY.peakMarker}
                    </Text>
                  </View>
                  <Arrow solid={isNow} color={isNow ? colors.marker : colors.mutedText} />
                </>
              )}
            </View>
          );
        })}
      </View>
      <View style={styles.cellRow}>
        {ENVI_LEVELS.map(item => (
          <View
            key={item.level}
            style={[
              styles.cell,
              { backgroundColor: item.color, borderColor: colors.outline },
              item.level !== level && styles.cellInactive,
            ]}
          >
            <Text style={[styles.cellText, { color: item.textColor }]}>{item.level}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  markerRow: { flexDirection: 'row', gap: cellGap, marginBottom: 3 },
  markerCell: {
    flex: 1,
    height: markerLabelHeight + arrowHeight + 2,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  labelBox: { position: 'absolute', top: 0, width: markerLabelMaxWidth, height: markerLabelHeight },
  label: { fontSize: markerLabelFontSize, fontWeight: '700' },
  cellRow: { flexDirection: 'row', gap: cellGap },
  cell: {
    flex: 1,
    height: cellHeight,
    borderRadius: cellRadius,
    alignItems: 'center',
    justifyContent: 'center',
    // Keeps the black "Serious" cell visible against the dark glass card.
    borderWidth: 0.5,
  },
  cellInactive: { opacity: inactiveOpacity },
  cellText: { fontSize: 12, fontWeight: '800' },
});

export default EnviBand;
