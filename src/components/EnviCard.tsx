// src/components/EnviCard.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ChevronRight, Leaf } from 'lucide-react-native';
import { glassCardStyle, glassLabelText } from '../styles/glassCard';
import { ENVI_ACTION_COPY, ENVI_COPY } from '../config/alertCopy';
import { ENVI_TONES } from '../config/enviConfig';
import { ENVI_ACTION_ICONS } from '../config/enviKeywordIcons';
import { ENVI_CARD_CONFIG } from '../config/homeLayoutConfig';
import { HazardReadings, getEnviLevel, getEnviLevelInfo } from '../utils/enviUtils';
import { enviKeywordsFor } from '../utils/enviKeywords';
import { enviSummaryFor } from '../utils/enviSummary';
import EnviBand from './EnviBand';
import EnviLevelSquare from './EnviLevelSquare';

type Props = {
  // Both hazards at the user's location; null = loading / unavailable.
  current: HazardReadings;
  // Today's peak level (utils/enviPeak); null = no peak arrow.
  peakLevel: number | null;
  // Tapping the index itself (square, name, band): its forecast.
  onOpenForecast: () => void;
  // The bottom bar: the recommendations sheet.
  onOpenDetails: () => void;
};

const TONE = ENVI_TONES.glass;
const C = ENVI_CARD_CONFIG;

// Home's headline, for glancing — keywords here, sentences in the
// recommendations sheet. Top to bottom:
// - the index block: level square, "Environmental Index", level name and
//   the five-level band — a tap opens the forecast;
// - one plain-language line on how heat and air are right now;
// - up to three action tiles;
// - "Detailed recommendations" (not at level 1 or without readings, when
//   there is nothing more to recommend).
// The card stays the same during a live alert — the alert has its banner,
// and its personalised advice leads the recommendations sheet.
const EnviCard: React.FC<Props> = ({ current, peakLevel, onOpenForecast, onOpenDetails }) => {
  const level = getEnviLevel(current);
  const info = level === null ? null : getEnviLevelInfo(level);
  const summary = enviSummaryFor(current);
  const { actions } = enviKeywordsFor(current);
  const showMore = level !== null && level > 1;

  return (
    <View style={styles.card}>
      <TouchableOpacity
        style={styles.indexBlock}
        onPress={onOpenForecast}
        activeOpacity={0.75}
        accessibilityRole="button"
        accessibilityLabel={
          info
            ? [ENVI_COPY.levelLabel(info.level, info.name), summary].filter(Boolean).join('. ')
            : ENVI_COPY.unavailableLabel
        }
        accessibilityHint={ENVI_COPY.forecastHint}
      >
        <View style={styles.headerRow}>
          <EnviLevelSquare level={level} tone="glass" />
          <View style={styles.headerText}>
            <View style={styles.labelRow}>
              <Leaf size={C.labelIconSize} color="#FFFFFF" />
              <Text style={styles.label} numberOfLines={1}>
                {ENVI_COPY.title}
              </Text>
            </View>
            <Text style={styles.levelName} numberOfLines={1}>
              {info?.name ?? ENVI_COPY.unavailable}
            </Text>
          </View>
          {/* Says the block opens something (the forecast). */}
          <ChevronRight size={C.moreIconSize} color={TONE.mutedText} />
        </View>

        <EnviBand level={level} peakLevel={peakLevel} tone="glass" />
      </TouchableOpacity>

      {summary !== null && <Text style={styles.summary}>{summary}</Text>}

      {actions.length > 0 && (
        <View
          style={styles.tileRow}
          accessible
          accessibilityLabel={actions.map(id => ENVI_ACTION_COPY[id].label).join(', ')}
        >
          {actions.map(id => {
            const Icon = ENVI_ACTION_ICONS[id];
            return (
              <View key={id} style={styles.tile}>
                <Icon size={C.tileIconSize} color="#FFFFFF" />
                <Text style={styles.tileText} numberOfLines={2}>
                  {ENVI_ACTION_COPY[id].label}
                </Text>
              </View>
            );
          })}
        </View>
      )}

      {showMore ? (
        <TouchableOpacity
          style={styles.moreBar}
          onPress={onOpenDetails}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityHint={ENVI_COPY.detailsHint}
        >
          <Text style={styles.moreText}>{ENVI_COPY.moreLink}</Text>
          <ChevronRight size={C.moreIconSize} color="#FFFFFF" />
        </TouchableOpacity>
      ) : (
        <View style={styles.bottomSpace} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    ...glassCardStyle,
    paddingTop: C.paddingVertical,
    paddingHorizontal: C.paddingHorizontal,
    marginBottom: 12,
    gap: C.rowGap,
    overflow: 'hidden',
  },
  indexBlock: { gap: C.rowGap },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  headerText: { flex: 1, gap: 2 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  label: { flexShrink: 1, fontSize: C.labelFontSize, fontWeight: '700', ...glassLabelText },
  levelName: { fontSize: C.levelNameFontSize, fontWeight: '700', ...glassLabelText },
  summary: { fontSize: C.summaryFontSize, fontWeight: '600', lineHeight: 20, ...glassLabelText },
  tileRow: { flexDirection: 'row', gap: 8 },
  tile: {
    flex: 1,
    alignItems: 'center',
    gap: 5,
    paddingVertical: C.tilePaddingVertical,
    paddingHorizontal: 4,
    borderRadius: C.tileRadius,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  tileText: { fontSize: C.tileFontSize, fontWeight: '600', textAlign: 'center', ...glassLabelText },
  moreBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    // Full card width, edge to edge under a hairline.
    marginHorizontal: -C.paddingHorizontal,
    paddingHorizontal: C.paddingHorizontal,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.3)',
  },
  moreText: { fontSize: C.moreFontSize, fontWeight: '700', ...glassLabelText },
  // Keeps the card's bottom padding when there is no bottom bar.
  bottomSpace: { height: Math.max(0, C.paddingVertical - C.rowGap) },
});

export default EnviCard;
