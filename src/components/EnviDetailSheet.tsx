// src/components/EnviDetailSheet.tsx
import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import ForecastSheet from './ForecastSheet';
import { HAZARD_KINDS } from '../config/alertConfig';
import { ENVI_COPY, HAZARD_COPY } from '../config/alertCopy';
import { HazardKind } from '../types/alerts';
import { getHeatIndexInfo } from '../utils/heatIndexUtils';
import { getAqhiInfo } from '../utils/aqhiUtils';
import { levelMeaning } from '../utils/hazardLevels';
import { hazardSuggestionFor } from '../utils/enviAdvice';
import { HazardReadings } from '../utils/enviUtils';

type Props = {
  visible: boolean;
  current: HazardReadings;
  onClose: () => void;
};

// Each hazard's own classification and colour — the same sources as its
// card, so the sheet can never name a level differently from the card.
const infoFor = (hazard: HazardKind, value: number) =>
  hazard === 'heat' ? getHeatIndexInfo(value) : getAqhiInfo(value);

// What opens from Home's ENVI card: what ENVI is, then heat index and air
// quality side by side as peers — level name, what that level means
// (Warning) and what to do (Suggestion). It describes the two hazards; it
// does not say how they combine into ENVI, by design.
// Built on ForecastSheet, a Modal with onRequestClose, so Android's back
// button closes it first.
const EnviDetailSheet: React.FC<Props> = ({ visible, current, onClose }) => (
  <ForecastSheet visible={visible} title={ENVI_COPY.title} onClose={onClose}>
    <ScrollView showsVerticalScrollIndicator={false}>
      <Text style={styles.explainer}>{ENVI_COPY.explainer}</Text>

      {HAZARD_KINDS.map(hazard => {
        const value = current[hazard];
        const info = value === null ? null : infoFor(hazard, value);
        const suggestion = hazardSuggestionFor(hazard, value);
        return (
          <View key={hazard} style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.hazardName}>{HAZARD_COPY[hazard].name}</Text>
              {info && <View style={[styles.swatch, { backgroundColor: info.color }]} />}
              <Text style={styles.levelName}>
                {info ? info.classification : ENVI_COPY.unavailable}
              </Text>
            </View>

            {info && (
              <>
                <Text style={styles.heading}>{ENVI_COPY.warningHeading}</Text>
                <Text style={styles.body}>{levelMeaning(hazard, info.classification)}</Text>
              </>
            )}
            {/* The lowest level has no suggestion — nothing needs doing. */}
            {suggestion !== null && (
              <>
                <Text style={styles.heading}>{ENVI_COPY.suggestionHeading}</Text>
                <Text style={styles.body}>{suggestion}</Text>
              </>
            )}
          </View>
        );
      })}
    </ScrollView>
  </ForecastSheet>
);

const styles = StyleSheet.create({
  explainer: { fontSize: 14, lineHeight: 20, color: '#333', marginBottom: 14 },
  section: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.15)',
    paddingVertical: 12,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  hazardName: { flex: 1, fontSize: 15, fontWeight: '700', color: '#222' },
  swatch: {
    width: 14,
    height: 14,
    borderRadius: 4,
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.15)', // keeps heat's pale Caution yellow visible on white
  },
  levelName: { fontSize: 15, fontWeight: '700', color: '#222' },
  heading: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8E8E93',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginTop: 10,
  },
  body: { fontSize: 13, lineHeight: 18, color: '#444', marginTop: 2 },
});

export default EnviDetailSheet;
