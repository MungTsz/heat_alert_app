// src/screens/EnviPreviewScreen.tsx
import React, { useState } from 'react';
import { Modal, View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft } from 'lucide-react-native';
import EnviCard from '../components/EnviCard';
import EnviDetailSheet from '../components/EnviDetailSheet';
import EnviForecastSheet from '../components/EnviForecastSheet';
import { useForecastData } from '../hooks/useForecastData';
import { useAqhiForecastData } from '../hooks/useAqhiForecastData';
import { FALLBACK_CENTER } from '../config/locationConfig';
import { isPraiseConfigured } from '../config/praiseConfig';
import { HOME_LAYOUT_CONFIG } from '../config/homeLayoutConfig';
import { ENVI_SAMPLES, EnviSample } from '../utils/enviSamples';
import { pickForecastHazard } from '../utils/forecastHazard';

type Props = { visible: boolean; onClose: () => void };

// A darker shade of Home's daytime sky, so the glass card reads as it does
// over the scene.
const PREVIEW_BACKGROUND = '#5D7A96';

// DEVELOPMENT BUILDS ONLY (opened from App settings' testing section).
// The real Environmental Index card in every situation it can be in, from
// SAMPLE readings (utils/enviSamples) — clearly marked, and never shown on
// Home. Each card responds as on Home: the index block opens the forecast,
// "Detailed recommendations" the recommendations sheet for that sample. The
// forecast charts are the real ones for central Hong Kong, since there is
// no sample forecast.
const EnviPreviewScreen: React.FC<Props> = ({ visible, onClose }) => {
  const [forecastFor, setForecastFor] = useState<EnviSample | null>(null);
  const [detailsFor, setDetailsFor] = useState<EnviSample | null>(null);
  const center = visible ? FALLBACK_CENTER : null;
  const heat = useForecastData(center);
  const aqhi = useAqhiForecastData(center);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={onClose}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Back"
          >
            <ArrowLeft size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Index preview</Text>
        </View>
        <Text style={styles.banner}>
          Sample readings — development preview only. Tap a card as you would on Home.
        </Text>

        <ScrollView contentContainerStyle={styles.list}>
          {ENVI_SAMPLES.map(s => (
            <View key={s.key} style={styles.item}>
              <Text style={styles.title}>{s.title}</Text>
              <Text style={styles.note}>
                Heat index {s.current.heat ?? '--'}°C · AQHI {s.current.aqhi ?? '--'} — {s.note}
              </Text>
              <EnviCard
                current={s.current}
                peakLevel={s.peakLevel}
                nowMs={s.nowMs}
                onOpenForecast={() => setForecastFor(s)}
                onOpenDetails={() => setDetailsFor(s)}
              />
            </View>
          ))}
        </ScrollView>
      </SafeAreaView>

      {detailsFor && (
        <EnviDetailSheet
          visible
          onClose={() => setDetailsFor(null)}
          current={detailsFor.current}
          peakLevel={detailsFor.peakLevel}
          liveAdvice={detailsFor.liveAdvice}
          nowMs={detailsFor.nowMs}
        />
      )}
      {forecastFor && (
        <EnviForecastSheet
          visible
          onClose={() => setForecastFor(null)}
          // The same rule Home uses for this sheet.
          defaultHazard={pickForecastHazard({
            current: forecastFor.current,
            praiseConfigured: isPraiseConfigured(),
            nowMs: forecastFor.nowMs,
          })}
          heatForecast={{ days: heat.days, loading: heat.loading }}
          aqhiForecast={{ days: aqhi.days, loading: aqhi.loading }}
        />
      )}
    </Modal>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: PREVIEW_BACKGROUND },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: HOME_LAYOUT_CONFIG.screenPadding,
    paddingTop: 10,
    paddingBottom: 8,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 26, fontWeight: 'bold', color: '#FFFFFF' },
  banner: {
    marginHorizontal: HOME_LAYOUT_CONFIG.screenPadding,
    marginBottom: 8,
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#FFF4E5',
    color: '#7C2D12',
    fontSize: 12,
    fontWeight: '700',
  },
  list: { padding: HOME_LAYOUT_CONFIG.screenPadding, paddingBottom: 60, gap: 18 },
  item: { gap: 6 },
  title: { fontSize: 16, fontWeight: '800', color: '#FFFFFF' },
  note: { fontSize: 12, lineHeight: 17, color: 'rgba(255,255,255,0.85)' },
});

export default EnviPreviewScreen;
