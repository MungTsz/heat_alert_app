// src/components/EnviLevelSquare.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ENVI_COPY } from '../config/alertCopy';
import { ENVI_TONES, EnviTone } from '../config/enviConfig';
import { ENVI_CARD_CONFIG } from '../config/homeLayoutConfig';
import { getEnviLevelInfo } from '../utils/enviUtils';

type Props = {
  // 1-5, or null while there is no reading ("--").
  level: number | null;
  // What it sits on: Home's dark glass card, or the white detail sheet.
  tone: EnviTone;
};

const { squareSize, squareRadius, squareNumberFontSize, squareOutlineWidth } = ENVI_CARD_CONFIG;

// The level number in its level colour — the one focal point of Home, and
// the header of the detail sheet. Decoration to a screen reader: the card
// and sheet read the level out themselves.
const EnviLevelSquare: React.FC<Props> = ({ level, tone }) => {
  const colors = ENVI_TONES[tone];
  const info = level === null ? null : getEnviLevelInfo(level);
  return (
    <View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.square,
        { backgroundColor: info ? info.color : colors.emptyFill },
        // Only level 5's black needs an edge, and only so it keeps a shape
        // on the dark card.
        info?.outlined && [styles.outlined, { borderColor: colors.outline }],
      ]}
    >
      <Text style={[styles.number, { color: info ? info.textColor : colors.emptyText }]}>
        {info ? info.level : ENVI_COPY.unavailable}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  square: {
    width: squareSize,
    height: squareSize,
    borderRadius: squareRadius,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outlined: { borderWidth: squareOutlineWidth },
  number: { fontSize: squareNumberFontSize, fontWeight: '800', includeFontPadding: false },
});

export default EnviLevelSquare;
