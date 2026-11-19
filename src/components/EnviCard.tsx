// src/components/EnviCard.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ChevronRight, Leaf, Pencil } from 'lucide-react-native';
import { glassCardStyle, glassLabelText } from '../styles/glassCard';
import { ENVI_ACTION_COPY, ENVI_COPY, ENVI_FOR_YOU_COPY } from '../config/alertCopy';
import { ENVI_TONES } from '../config/enviConfig';
import { ENVI_ACTION_ICONS } from '../config/enviKeywordIcons';
import { ENVI_CARD_CONFIG } from '../config/homeLayoutConfig';
import { HazardReadings, getEnviLevel, getEnviLevelInfo } from '../utils/enviUtils';
import { EnviAdviceFor, GENERAL_ADVICE_FOR, enviKeywordsFor } from '../utils/enviKeywords';
import { forYouLineFor } from '../utils/enviForYou';
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
  // Who the advice is for and where they are (utils/enviKeywords). Left
  // out: the general advice, and no "For you" line.
  advice?: EnviAdviceFor;
  // The "For you" line: the one-tap "where are you now" correction (and the
  // way to About you). Left out, the line is shown but can't be tapped.
  onOpenForYou?: () => void;
  // Settles a tie by season. Home leaves it out (now); the dev preview
  // passes a sample's date.
  nowMs?: number;
  // Development builds only: Home opens the every-state preview on a long
  // press of the index block. Left out in release builds.
  onLongPressIndex?: () => void;
};

const TONE = ENVI_TONES.glass;
const C = ENVI_CARD_CONFIG;

// The "For you" row is one text line tall; its touch area reaches above and
// below it to a full-size target without spacing the card out.
const FOR_YOU_SLOP = Math.max(0, (C.forYouMinTouchHeight - C.forYouLineHeight) / 2);
const FOR_YOU_HIT_SLOP = { top: FOR_YOU_SLOP, bottom: FOR_YOU_SLOP, left: 0, right: 0 };

// Home's headline, for glancing — keywords here, sentences in the
// recommendations sheet. Top to bottom:
// - the index block: level square, "Environmental Index", level name and
//   the five-level band — a tap opens the forecast;
// - one plain-language line on how heat and air are right now;
// - "For you: Pregnant · Outdoors now" — who and where the advice below is
//   for, tapping it corrects where;
// - up to three action tiles, fitted to that person and place;
// - "Detailed recommendations" (not at level 1 or without readings, when
//   there is nothing more to recommend — nor anything personal to say).
// The index itself is the same for everyone: only the words change. The
// card stays the same during a live alert — the alert has its banner, and
// its personalised advice leads the recommendations sheet.
const EnviCard: React.FC<Props> = ({
  current,
  peakLevel,
  onOpenForecast,
  onOpenDetails,
  advice,
  onOpenForYou,
  nowMs,
  onLongPressIndex,
}) => {
  const level = getEnviLevel(current);
  const info = level === null ? null : getEnviLevelInfo(level);
  const summary = enviSummaryFor(current, nowMs);
  const { actions } = enviKeywordsFor(current, nowMs, advice ?? GENERAL_ADVICE_FOR);
  const showMore = level !== null && level > 1;
  const forYou = advice && showMore ? forYouLineFor(advice) : null;

  return (
    <View style={styles.card}>
      <TouchableOpacity
        style={styles.indexBlock}
        onPress={onOpenForecast}
        onLongPress={onLongPressIndex}
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

      {forYou !== null && (
        <TouchableOpacity
          style={styles.forYouRow}
          onPress={onOpenForYou}
          disabled={!onOpenForYou}
          hitSlop={FOR_YOU_HIT_SLOP}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityHint={ENVI_FOR_YOU_COPY.hint}
        >
          <Text style={styles.forYouText} numberOfLines={1}>
            {forYou}
          </Text>
          <Pencil size={C.forYouIconSize} color={TONE.mutedText} />
        </TouchableOpacity>
      )}

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
  forYouRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  forYouText: {
    flexShrink: 1,
    fontSize: C.forYouFontSize,
    lineHeight: C.forYouLineHeight,
    fontWeight: '600',
    ...glassLabelText,
  },
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
