// src/components/EnviCard.tsx
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { glassCardStyle, glassLabelText } from '../styles/glassCard';
import { ENVI_COPY } from '../config/alertCopy';
import { HOME_LAYOUT_CONFIG } from '../config/homeLayoutConfig';
import { HazardReadings, getEnviLevel, getEnviLevelInfo } from '../utils/enviUtils';
import EnviBand from './EnviBand';
import EnviDetailSheet from './EnviDetailSheet';

type Props = {
  // Both hazards at the user's location; null = loading / unavailable.
  current: HazardReadings;
  // The one sentence Home gives (utils/homeAdvice): an alert's own advice
  // while one is live, else the suggestion for this level. null = no line.
  advice: string | null;
};

// Home's headline: one level for heat and air together. Top to bottom —
// "ENVI", the level number and name; the five-level band; then the advice
// sentence, when there is one. The whole card opens EnviDetailSheet.
//
// The card shows only the outcome. Nothing on it says which hazard set the
// level or how the level is worked out, and the two smaller cards below
// carry no "this one decides" mark either.
const EnviCard: React.FC<Props> = ({ current, advice }) => {
  const [detailOpen, setDetailOpen] = useState(false);
  const level = getEnviLevel(current);
  const info = level === null ? null : getEnviLevelInfo(level);

  return (
    <>
      <TouchableOpacity
        style={styles.card}
        onPress={() => setDetailOpen(true)}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={
          info
            ? [ENVI_COPY.levelLabel(info.level, info.name), advice].filter(Boolean).join('. ')
            : ENVI_COPY.unavailableLabel
        }
        accessibilityHint={ENVI_COPY.detailsHint}
      >
        <View style={styles.headerRow}>
          <Text style={styles.title}>{ENVI_COPY.title}</Text>
          {/* "--" while loading or unavailable — never a made-up level. */}
          {info ? (
            <View style={[styles.levelChip, { backgroundColor: info.color }]}>
              <Text style={[styles.levelNumber, { color: info.textColor }]}>{info.level}</Text>
            </View>
          ) : (
            <Text style={styles.unavailable}>{ENVI_COPY.unavailable}</Text>
          )}
          <Text style={styles.levelName} numberOfLines={1}>
            {info?.name ?? ''}
          </Text>
          {/* Up here rather than beside the advice, so the card still shows
              it can be opened on a level 1 day, when there is no advice. */}
          <ChevronRight size={18} color="#FFFFFF" />
        </View>

        <EnviBand level={level} />

        {advice !== null && <Text style={styles.advice}>{advice}</Text>}
      </TouchableOpacity>

      <EnviDetailSheet
        visible={detailOpen}
        current={current}
        onClose={() => setDetailOpen(false)}
      />
    </>
  );
};

const styles = StyleSheet.create({
  card: {
    ...glassCardStyle,
    paddingVertical: HOME_LAYOUT_CONFIG.enviCardPaddingVertical,
    paddingHorizontal: 14,
    marginBottom: 10,
    gap: 8,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { fontSize: 16, fontWeight: '700', ...glassLabelText },
  levelChip: {
    minWidth: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    // Keeps the black level 5 chip visible against the dark glass card.
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.45)',
  },
  levelNumber: { fontSize: 22, fontWeight: '800' },
  unavailable: { fontSize: 22, fontWeight: '800', ...glassLabelText },
  levelName: { flex: 1, fontSize: 18, fontWeight: '700', ...glassLabelText },
  advice: { fontSize: 13, fontWeight: '600', lineHeight: 18, ...glassLabelText },
});

export default EnviCard;
