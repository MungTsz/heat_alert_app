// src/components/alerts/AlertDetailSheet.tsx
import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Linking,
  useWindowDimensions,
} from 'react-native';
import { AlertDetailItem, AlertMessageRecord, HazardKind } from '../../types/alerts';
import { HAZARD_KINDS } from '../../config/alertConfig';
import {
  AQHI_LEVEL_MEANING,
  DETAIL_COPY,
  HAZARD_COPY,
  OFFICIAL_LINKS,
} from '../../config/alertCopy';
import { ALERT_UI } from '../../config/alertUiConfig';
import {
  readAlertFeedback,
  readMessageLog,
  saveAlertFeedback,
} from '../../services/alertStateStorage';
import { levelAtRank } from '../../utils/hazardLevels';
import { urgentRankFor } from '../../utils/alertProfile';
import {
  adviceFor,
  describeRange,
  describeSentAt,
  describeStart,
  describeValue,
} from '../../utils/alertMessages';
import { getHeatZoneByClassification } from '../../utils/heatIndexUtils';
import { getAqhiInfo } from '../../utils/aqhiUtils';
import { useForecastData } from '../../hooks/useForecastData';
import { useAqhiForecastData } from '../../hooks/useAqhiForecastData';
import ForecastSheet from '../ForecastSheet';
import HeatHourlyForecastChart from '../HeatHourlyForecastChart';
import AqhiHourlyForecastChart from '../AqhiHourlyForecastChart';

type Props = {
  messageId: string | null;
  onClose: () => void;
};

// The swatch uses each hazard's own color source: the heat zone table, and
// AQHI's per-value colors (from a real reading/forecast value — never a
// made-up sample).
const swatchColor = (item: AlertDetailItem): string | null => {
  if (item.hazard === 'heat') {
    return getHeatZoneByClassification(levelAtRank('heat', item.rank)).color;
  }
  const value = item.value ?? item.forecast?.maxValue ?? null;
  return value === null ? null : getAqhiInfo(value).color;
};

const itemLine = (item: AlertDetailItem, nowMs: number): string => {
  switch (item.stage) {
    case 'forecast':
      return item.forecast
        ? DETAIL_COPY.itemExpected(
            describeRange(item.hazard, item.forecast.minValue, item.forecast.maxValue),
            describeStart(item.forecast.startMs, nowMs),
          )
        : levelAtRank(item.hazard, item.rank);
    case 'cancelled':
      return DETAIL_COPY.itemCancelled;
    case 'cleared':
      return DETAIL_COPY.itemCleared(
        item.value === null ? levelAtRank(item.hazard, 0) : describeValue(item.hazard, item.value),
      );
    default:
      return DETAIL_COPY.itemNow(
        item.value === null ? levelAtRank(item.hazard, item.rank) : describeValue(item.hazard, item.value),
      );
  }
};

const levelMeaning = (hazard: HazardKind, level: string): string =>
  hazard === 'heat' ? getHeatZoneByClassification(level).risk : AQHI_LEVEL_MEANING[level] ?? '';

// What the user was told, in full: each place's level, what the level
// means, the same advice as the push, the forecast chart for the first
// place, sources, the official links, and a "was this helpful?" answer.
// Heat and air quality get the same sections in the same order.
const AlertDetailSheet = ({ messageId, onClose }: Props) => {
  const { height } = useWindowDimensions();
  const [record, setRecord] = useState<AlertMessageRecord | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [helpful, setHelpful] = useState<boolean | null>(null);

  useEffect(() => {
    if (!messageId) return;
    let isMounted = true;
    setLoaded(false);
    Promise.all([readMessageLog(), readAlertFeedback()]).then(([log, feedback]) => {
      if (!isMounted) return;
      setRecord(log.find(r => r.id === messageId) ?? null);
      setHelpful(feedback[messageId]?.helpful ?? null);
      setLoaded(true);
    });
    return () => {
      isMounted = false;
    };
  }, [messageId]);

  const items = useMemo(() => record?.items ?? [], [record]);
  const lead = items[0];
  const leadCoords =
    lead && lead.latitude !== null && lead.longitude !== null
      ? { latitude: lead.latitude, longitude: lead.longitude }
      : null;
  const hazards = HAZARD_KINDS.filter(h => items.some(item => item.hazard === h));
  const leadHazards = HAZARD_KINDS.filter(h =>
    items.some(item => item.hazard === h && item.placeId === lead?.placeId),
  );

  // Charts only for hazards in this message, at the first place.
  const heatForecast = useForecastData(leadHazards.includes('heat') ? leadCoords : null);
  const aqhiForecast = useAqhiForecastData(leadHazards.includes('aqhi') ? leadCoords : null);

  const meanings = useMemo(() => {
    const seen = new Set<string>();
    return items.flatMap(item => {
      if (item.stage === 'cancelled' || item.stage === 'cleared') return [];
      const level = levelAtRank(item.hazard, item.rank);
      const key = `${item.hazard}|${level}`;
      if (seen.has(key)) return [];
      seen.add(key);
      return [{ key, title: `${HAZARD_COPY[item.hazard].name} ${level}`, text: levelMeaning(item.hazard, level) }];
    });
  }, [items]);

  const nowMs = Date.now();
  const showAdvice = lead && meanings.length > 0;

  const answer = (value: boolean) => {
    if (!messageId) return;
    setHelpful(value);
    saveAlertFeedback(messageId, value);
  };

  return (
    <ForecastSheet visible={messageId !== null} title={DETAIL_COPY.sheetTitle} onClose={onClose}>
      <ScrollView style={{ maxHeight: height * ALERT_UI.detailScrollMaxHeightRatio }}>
        {loaded && !record ? (
          <Text style={styles.body}>{DETAIL_COPY.missing}</Text>
        ) : record ? (
          <View>
            <Text style={styles.title}>{record.title}</Text>
            <Text style={styles.meta}>{describeSentAt(record.sentAtMs, nowMs)}</Text>
            <Text style={styles.body}>{record.body}</Text>

            {items.length > 0 && (
              <>
                <Text style={styles.heading}>{DETAIL_COPY.placesHeading}</Text>
                {items.map(item => {
                  const color = swatchColor(item);
                  return (
                    <View key={item.eventKey} style={styles.itemCard}>
                      <View style={[styles.swatch, color ? { backgroundColor: color } : styles.swatchEmpty]} />
                      <View style={styles.itemText}>
                        <Text style={styles.itemPlace}>
                          {item.placeLabel} · {HAZARD_COPY[item.hazard].name}
                        </Text>
                        <Text style={styles.itemLine}>{itemLine(item, nowMs)}</Text>
                      </View>
                    </View>
                  );
                })}
              </>
            )}

            {meanings.length > 0 && (
              <>
                <Text style={styles.heading}>{DETAIL_COPY.meaningHeading}</Text>
                {meanings.map(m => (
                  <Text key={m.key} style={styles.body}>
                    <Text style={styles.bold}>{m.title}: </Text>
                    {m.text}
                  </Text>
                ))}
              </>
            )}

            {showAdvice && (
              <>
                <Text style={styles.heading}>{DETAIL_COPY.adviceHeading}</Text>
                <Text style={styles.body}>
                  {adviceFor(hazards, lead, lead.rank >= urgentRankFor(lead.hazard))}
                </Text>
              </>
            )}

            {leadCoords && leadHazards.length > 0 && (
              <>
                <Text style={styles.heading}>{DETAIL_COPY.forecastHeading(lead.placeLabel)}</Text>
                {leadHazards.includes('heat') && (
                  <HeatHourlyForecastChart days={heatForecast.days} loading={heatForecast.loading} />
                )}
                {leadHazards.includes('aqhi') && (
                  <AqhiHourlyForecastChart days={aqhiForecast.days} loading={aqhiForecast.loading} />
                )}
              </>
            )}

            <Text style={styles.heading}>{DETAIL_COPY.sourcesHeading}</Text>
            <Text style={styles.small}>{DETAIL_COPY.sources}</Text>
            {OFFICIAL_LINKS.map(link => (
              <TouchableOpacity key={link.url} onPress={() => Linking.openURL(link.url)}>
                <Text style={styles.link}>{link.label}</Text>
              </TouchableOpacity>
            ))}
            <Text style={styles.small}>{DETAIL_COPY.disclaimer}</Text>

            <View style={styles.feedbackRow}>
              {helpful === null ? (
                <>
                  <Text style={styles.feedbackQuestion}>{DETAIL_COPY.helpfulQuestion}</Text>
                  <TouchableOpacity style={styles.feedbackButton} onPress={() => answer(true)}>
                    <Text style={styles.feedbackButtonText}>{DETAIL_COPY.yes}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.feedbackButton} onPress={() => answer(false)}>
                    <Text style={styles.feedbackButtonText}>{DETAIL_COPY.no}</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <Text style={styles.small}>{DETAIL_COPY.thanks}</Text>
              )}
            </View>
          </View>
        ) : null}
      </ScrollView>
    </ForecastSheet>
  );
};

const styles = StyleSheet.create({
  title: { fontSize: 17, fontWeight: '700', color: '#222' },
  meta: { fontSize: 12, color: ALERT_UI.mutedTextColor, marginTop: 2, marginBottom: 8 },
  body: { fontSize: 14, lineHeight: 20, color: '#333', marginBottom: 6 },
  bold: { fontWeight: '700' },
  heading: { fontSize: 13, fontWeight: '700', color: '#555', marginTop: 16, marginBottom: 6 },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E2E2',
  },
  swatch: { width: 12, height: 32, borderRadius: 3 },
  swatchEmpty: { backgroundColor: '#E2E2E2' },
  itemText: { flex: 1 },
  itemPlace: { fontSize: 14, fontWeight: '600', color: '#222' },
  itemLine: { fontSize: 13, color: '#555', marginTop: 2 },
  small: { fontSize: 12, lineHeight: 17, color: ALERT_UI.mutedTextColor, marginBottom: 6 },
  link: { fontSize: 13, color: '#3B6FB6', fontWeight: '600', marginBottom: 6 },
  feedbackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 14,
    marginBottom: 6,
  },
  feedbackQuestion: { flex: 1, fontSize: 14, color: '#333' },
  feedbackButton: {
    borderWidth: 1,
    borderColor: ALERT_UI.accentColor,
    borderRadius: 14,
    paddingVertical: 5,
    paddingHorizontal: 14,
  },
  feedbackButtonText: { color: ALERT_UI.accentColor, fontWeight: '700' },
});

export default AlertDetailSheet;
