// src/components/EnviDetailSheet.tsx
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import ForecastSheet from './ForecastSheet';
import EnviBand from './EnviBand';
import EnviLevelSquare from './EnviLevelSquare';
import { ENVI_COPY, ENVI_FOR_YOU_COPY, OFFICIAL_LINKS } from '../config/alertCopy';
import { ENVI_ACTION_ICONS, ENVI_WARNING_ICON } from '../config/enviKeywordIcons';
import { ENVI_TONES } from '../config/enviConfig';
import { HazardReadings, getEnviLevel, getEnviLevelInfo } from '../utils/enviUtils';
import {
  EnviAdviceFor,
  GENERAL_ADVICE_FOR,
  enviActionSentence,
  enviKeywordsFor,
} from '../utils/enviKeywords';
import { basedOnFor } from '../utils/enviForYou';
import { enviSummaryFor } from '../utils/enviSummary';

type Props = {
  visible: boolean;
  onClose: () => void;
  current: HazardReadings;
  peakLevel: number | null;
  // A live alert's personalised advice (utils/homeAdvice); null = none.
  liveAdvice: string | null;
  // Who the advice is for and where they are, as on the card. Left out:
  // the general advice, with no "Based on".
  advice?: EnviAdviceFor;
  // false adds the one quiet line suggesting location tracking (only here,
  // never a pop-up). Left out: no line.
  trackingOn?: boolean;
  // Settles a tie by season; left out on Home (now), set by the dev preview.
  nowMs?: number;
};

const TONE = ENVI_TONES.sheet;

// What the card's "Detailed recommendations" opens — the place for reading
// (the forecast has its own sheet, opened from the index itself):
// 1. the same square, level name and band as the card;
// 2. what it means: what the index is, and the card's plain-language line;
// 3. the health risk at this level;
// 4. recommended actions as full sentences: "Based on: …" first, led during
//    a live alert by that alert's own advice for the user, then the card's
//    tiles, every other tip for this person, and for regular medicine the
//    "ask your doctor or pharmacist" line;
// 5. the official HKO and EPD pages;
// 6. with tracking off, one line saying it would fit the advice to where
//    the user is.
// Built on ForecastSheet, a Modal with onRequestClose, so Android's back
// button closes it first.
const EnviDetailSheet: React.FC<Props> = ({
  visible,
  onClose,
  current,
  peakLevel,
  liveAdvice,
  advice,
  trackingOn,
  nowMs,
}) => {
  const level = getEnviLevel(current);
  const info = level === null ? null : getEnviLevelInfo(level);
  const summary = enviSummaryFor(current, nowMs);
  const adviceFor = advice ?? GENERAL_ADVICE_FOR;
  const { warnings, sheetActions, medicineNote } = enviKeywordsFor(current, nowMs, adviceFor);
  const hasAdvice = liveAdvice !== null || sheetActions.length > 0;

  return (
    <ForecastSheet visible={visible} title={ENVI_COPY.recommendationsTitle} onClose={onClose}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View
          style={styles.headerRow}
          accessible
          accessibilityLabel={
            info ? ENVI_COPY.levelLabel(info.level, info.name) : ENVI_COPY.unavailableLabel
          }
        >
          <EnviLevelSquare level={level} tone="sheet" />
          <View style={styles.headerText}>
            <Text style={styles.indexName}>{ENVI_COPY.title}</Text>
            <Text style={styles.levelName}>{info?.name ?? ENVI_COPY.unavailable}</Text>
          </View>
        </View>
        <EnviBand level={level} peakLevel={peakLevel} tone="sheet" />

        <Text style={styles.heading}>{ENVI_COPY.meaningHeading}</Text>
        {summary !== null && <Text style={styles.summary}>{summary}</Text>}
        <Text style={styles.body}>{ENVI_COPY.explainer}</Text>

        {warnings.length > 0 && (
          <>
            <Text style={styles.heading}>{ENVI_COPY.riskHeading}</Text>
            {warnings.map(warning => (
              <View key={warning} style={styles.row}>
                <ENVI_WARNING_ICON size={18} color={TONE.marker} />
                <Text style={styles.rowText}>{warning}</Text>
              </View>
            ))}
          </>
        )}

        {hasAdvice && (
          <>
            <Text style={styles.heading}>{ENVI_COPY.adviceHeading}</Text>
            {/* Only when the advice is personal; at level 1 everyone gets
                the same calm tile. */}
            {advice && level !== null && level > 1 && (
              <Text style={styles.basedOn}>{basedOnFor(advice)}</Text>
            )}
            {liveAdvice !== null && <Text style={styles.liveAdvice}>{liveAdvice}</Text>}
            {sheetActions.map(id => {
              const Icon = ENVI_ACTION_ICONS[id];
              return (
                <View key={id} style={styles.row}>
                  <Icon size={18} color={TONE.marker} />
                  <Text style={styles.rowText}>{enviActionSentence(id, adviceFor.caringFor)}</Text>
                </View>
              );
            })}
            {medicineNote && (
              <Text style={styles.body}>{ENVI_FOR_YOU_COPY.medicineNote[adviceFor.caringFor]}</Text>
            )}
          </>
        )}

        <Text style={styles.heading}>{ENVI_COPY.linksHeading}</Text>
        {OFFICIAL_LINKS.map(link => (
          <TouchableOpacity
            key={link.url}
            onPress={() => Linking.openURL(link.url)}
            accessibilityRole="link"
          >
            <Text style={styles.link}>{link.label}</Text>
          </TouchableOpacity>
        ))}

        {trackingOn === false && adviceFor.caringFor === 'self' && (
          <Text style={styles.trackingHint}>{ENVI_FOR_YOU_COPY.trackingHint}</Text>
        )}
      </ScrollView>
    </ForecastSheet>
  );
};

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 10 },
  headerText: { flex: 1, gap: 2 },
  indexName: { fontSize: 14, fontWeight: '700', color: TONE.mutedText },
  levelName: { fontSize: 22, fontWeight: '700', color: '#222' },
  heading: {
    fontSize: 11,
    fontWeight: '700',
    color: TONE.mutedText,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginTop: 18,
    marginBottom: 6,
  },
  summary: { fontSize: 15, lineHeight: 21, fontWeight: '700', color: '#222', marginBottom: 4 },
  body: { fontSize: 14, lineHeight: 20, color: '#333' },
  liveAdvice: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
    color: '#222',
    marginBottom: 8,
  },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 8 },
  rowText: { flex: 1, fontSize: 14, lineHeight: 20, color: '#333' },
  basedOn: { fontSize: 13, lineHeight: 18, color: TONE.mutedText, marginBottom: 8 },
  link: { fontSize: 14, color: '#1E66D0', paddingVertical: 4 },
  trackingHint: {
    fontSize: 13,
    lineHeight: 18,
    color: TONE.mutedText,
    marginTop: 18,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#DDD',
  },
});

export default EnviDetailSheet;
