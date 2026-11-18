// src/components/EnviCard.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ChevronRight, Gauge } from 'lucide-react-native';
import { glassCardStyle, glassLabelText } from '../styles/glassCard';
import { ENVI_ACTION_COPY, ENVI_COPY } from '../config/alertCopy';
import { ENVI_TONES } from '../config/enviConfig';
import { ENVI_ACTION_ICONS, ENVI_WARNING_ICON } from '../config/enviKeywordIcons';
import { ENVI_CARD_CONFIG } from '../config/homeLayoutConfig';
import { HazardReadings, getEnviLevel, getEnviLevelInfo } from '../utils/enviUtils';
import { enviKeywordsFor } from '../utils/enviKeywords';
import EnviBand from './EnviBand';
import EnviLevelSquare from './EnviLevelSquare';

type Props = {
  // Both hazards at the user's location; null = loading / unavailable.
  current: HazardReadings;
  // Today's peak level (utils/enviPeak); null = no peak arrow.
  peakLevel: number | null;
  // The bottom bar: opens EnviDetailSheet, owned by Home with the forecasts.
  onOpenDetails: () => void;
};

const TONE = ENVI_TONES.glass;
const C = ENVI_CARD_CONFIG;

// Home's headline, for glancing — keywords here, sentences in the detail
// sheet. Top to bottom: the level square with "Environmental Index" and the
// level name; the five-level band with its arrows; one warning chip (two
// when both hazards are high); up to three action tiles; then "Full advice
// and forecast". At level 1 only the calm tile shows, and with no readings
// only the "--" square and a faded band.
//
// The card shows only the outcome: nothing on it says which hazard set the
// level or how the level is worked out. It also stays the same during a
// live alert — the alert has its banner, and its personalised advice leads
// the detail sheet.
const EnviCard: React.FC<Props> = ({ current, peakLevel, onOpenDetails }) => {
  const level = getEnviLevel(current);
  const info = level === null ? null : getEnviLevelInfo(level);
  const { warnings, actions } = enviKeywordsFor(current);
  // Below level 2 there is nothing more to read, so no way into the sheet.
  const showMore = level !== null && level > 1;

  const accessibilityLabel = info
    ? [
        ENVI_COPY.levelLabel(info.level, info.name),
        ...warnings,
        ...actions.map(id => ENVI_ACTION_COPY[id].label),
      ].join('. ')
    : ENVI_COPY.unavailableLabel;

  return (
    <View style={styles.card}>
      <View style={styles.summary} accessible accessibilityLabel={accessibilityLabel}>
        <View style={styles.headerRow}>
          <EnviLevelSquare level={level} tone="glass" />
          <View style={styles.headerText}>
            <View style={styles.labelRow}>
              <Gauge size={C.labelIconSize} color={TONE.mutedText} />
              <Text style={styles.label}>{ENVI_COPY.title}</Text>
            </View>
            <Text style={styles.levelName} numberOfLines={1}>
              {info?.name ?? ENVI_COPY.unavailable}
            </Text>
          </View>
        </View>

        <EnviBand level={level} peakLevel={peakLevel} tone="glass" />

        {warnings.length > 0 && (
          <View style={styles.chipRow}>
            {warnings.map(warning => (
              <View key={warning} style={styles.chip}>
                <ENVI_WARNING_ICON size={C.chipIconSize} color="#FFFFFF" />
                <Text style={styles.chipText}>{warning}</Text>
              </View>
            ))}
          </View>
        )}

        {actions.length > 0 && (
          <View style={styles.tileRow}>
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
      </View>

      {showMore && (
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
    overflow: 'hidden',
  },
  summary: { gap: C.rowGap, paddingBottom: C.paddingVertical },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  headerText: { flex: 1, gap: 2 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  label: { fontSize: C.labelFontSize, fontWeight: '600', color: TONE.mutedText },
  levelName: { fontSize: C.levelNameFontSize, fontWeight: '700', ...glassLabelText },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 4,
    paddingHorizontal: 9,
    borderRadius: C.chipRadius,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  chipText: { fontSize: C.chipFontSize, fontWeight: '700', ...glassLabelText },
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
});

export default EnviCard;
