// src/components/EnviDetailSheet.tsx
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import ForecastSheet from './ForecastSheet';
import EnviBand from './EnviBand';
import EnviLevelSquare from './EnviLevelSquare';
import HeatHourlyForecastChart from './HeatHourlyForecastChart';
import AqhiHourlyForecastChart from './AqhiHourlyForecastChart';
import { ENVI_ACTION_COPY, ENVI_COPY, OFFICIAL_LINKS } from '../config/alertCopy';
import { ENVI_ACTION_ICONS } from '../config/enviKeywordIcons';
import { ENVI_TONES } from '../config/enviConfig';
import { DayForecast } from '../data/forecast/types';
import { AqhiDayForecast } from '../data/aqhiForecast/types';
import { HazardKind } from '../types/alerts';
import { HazardReadings, getEnviLevel, getEnviLevelInfo } from '../utils/enviUtils';
import { enviKeywordsFor } from '../utils/enviKeywords';

type Props = {
  visible: boolean;
  onClose: () => void;
  current: HazardReadings;
  peakLevel: number | null;
  // A live alert's personalised advice (utils/homeAdvice); null = none.
  liveAdvice: string | null;
  // Whose forecast to show: the hazard that sets the level, or the
  // season's on a tie — the map's starting layer, so the two agree.
  chartHazard: HazardKind;
  heatForecast: { days: DayForecast[]; loading: boolean };
  aqhiForecast: { days: AqhiDayForecast[]; loading: boolean };
};

const TONE = ENVI_TONES.sheet;

// What the card's "Full advice and forecast" opens — the place for reading:
// 1. the same square, level name and band as the card;
// 2. what the Environmental Index is (never how it is worked out);
// 3. each action tile as a full sentence, led during a live alert by that
//    alert's own advice for the user;
// 4. the leading hazard's forecast chart (the existing charts);
// 5. the official HKO and EPD pages.
// Built on ForecastSheet, a Modal with onRequestClose, so Android's back
// button closes it first.
const EnviDetailSheet: React.FC<Props> = ({
  visible,
  onClose,
  current,
  peakLevel,
  liveAdvice,
  chartHazard,
  heatForecast,
  aqhiForecast,
}) => {
  const level = getEnviLevel(current);
  const info = level === null ? null : getEnviLevelInfo(level);
  const { actions } = enviKeywordsFor(current);

  return (
    <ForecastSheet visible={visible} title={ENVI_COPY.title} onClose={onClose}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View
          style={styles.headerRow}
          accessible
          accessibilityLabel={
            info ? ENVI_COPY.levelLabel(info.level, info.name) : ENVI_COPY.unavailableLabel
          }
        >
          <EnviLevelSquare level={level} tone="sheet" />
          <Text style={styles.levelName}>{info?.name ?? ENVI_COPY.unavailable}</Text>
        </View>
        <EnviBand level={level} peakLevel={peakLevel} tone="sheet" />

        <Text style={styles.heading}>{ENVI_COPY.meaningHeading}</Text>
        <Text style={styles.body}>{ENVI_COPY.explainer}</Text>

        {(liveAdvice !== null || actions.length > 0) && (
          <>
            <Text style={styles.heading}>{ENVI_COPY.adviceHeading}</Text>
            {liveAdvice !== null && <Text style={styles.liveAdvice}>{liveAdvice}</Text>}
            {actions.map(id => {
              const Icon = ENVI_ACTION_ICONS[id];
              return (
                <View key={id} style={styles.adviceRow}>
                  <Icon size={18} color={TONE.marker} />
                  <Text style={styles.adviceText}>{ENVI_ACTION_COPY[id].sentence}</Text>
                </View>
              );
            })}
          </>
        )}

        <Text style={styles.heading}>{ENVI_COPY.forecastHeading}</Text>
        {chartHazard === 'heat' ? (
          <HeatHourlyForecastChart days={heatForecast.days} loading={heatForecast.loading} />
        ) : (
          <AqhiHourlyForecastChart days={aqhiForecast.days} loading={aqhiForecast.loading} />
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
      </ScrollView>
    </ForecastSheet>
  );
};

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 10 },
  levelName: { flex: 1, fontSize: 22, fontWeight: '700', color: '#222' },
  heading: {
    fontSize: 11,
    fontWeight: '700',
    color: TONE.mutedText,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginTop: 18,
    marginBottom: 6,
  },
  body: { fontSize: 14, lineHeight: 20, color: '#333' },
  liveAdvice: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
    color: '#222',
    marginBottom: 8,
  },
  adviceRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 8 },
  adviceText: { flex: 1, fontSize: 14, lineHeight: 20, color: '#333' },
  link: { fontSize: 14, color: '#1E66D0', paddingVertical: 4 },
});

export default EnviDetailSheet;
