// src/components/EnviLevelSquare.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ENVI_COPY } from '../config/alertCopy';
import { ENVI_TONES, EnviTone } from '../config/enviConfig';
import { ENVI_CARD_CONFIG } from '../config/homeLayoutConfig';
import { getEnviLevelInfo } from '../utils/enviUtils';

export type EnviSquareDimensions = {
  squareSize: number;
  squareRadius: number;
  squareNumberFontSize: number;
};

type Props = {
  // 1-5, or null while there is no reading ("--").
  level: number | null;
  // What it sits on: Home's dark glass card, or a white surface (the detail
  // sheet, a map pin, the map's point card).
  tone: EnviTone;
  // Smaller copies (map pins, the map's point card) pass their own sizes
  // from config; Home's card size otherwise.
  dimensions?: EnviSquareDimensions;
};

// The level number in its level colour — the one focal point of Home, and
// the header of the detail sheet. Decoration to a screen reader: the card
// and sheet read the level out themselves.
const EnviLevelSquare: React.FC<Props> = ({ level, tone, dimensions = ENVI_CARD_CONFIG }) => {
  const colors = ENVI_TONES[tone];
  const info = level === null ? null : getEnviLevelInfo(level);
  const { squareSize, squareRadius, squareNumberFontSize } = dimensions;
  return (
    <View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.square,
        { width: squareSize, height: squareSize, borderRadius: squareRadius },
        { backgroundColor: info ? info.color : colors.emptyFill },
        // Only level 5's black needs an edge, and only so it keeps a shape
        // on the dark card.
        info?.outlined && [styles.outlined, { borderColor: colors.outline }],
      ]}
    >
      <Text
        style={[
          styles.number,
          { fontSize: squareNumberFontSize, color: info ? info.textColor : colors.emptyText },
        ]}
      >
        {info ? info.level : ENVI_COPY.unavailable}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  square: { alignItems: 'center', justifyContent: 'center' },
  outlined: { borderWidth: ENVI_CARD_CONFIG.squareOutlineWidth },
  number: { fontWeight: '800', includeFontPadding: false },
});

export default EnviLevelSquare;
