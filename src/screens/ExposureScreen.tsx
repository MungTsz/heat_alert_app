// src/screens/ExposureScreen.tsx
import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Footprints, ChevronRight, Plus } from 'lucide-react-native';
import ImportTrackModal from '../components/ImportTrackModal';
import ImportProgressBanner from '../components/ImportProgressBanner';
import DeviceCard from '../components/DeviceCard';
import DeviceDetailModal from '../components/DeviceDetailModal';
import LiveDeviceDetailModal from '../components/LiveDeviceDetailModal';
import { useTodayExposure } from '../hooks/useTodayExposure';
import { useExposureTrackingSettings } from '../hooks/useExposureTrackingSettings';
import { useExposureHistory } from '../hooks/useExposureHistory';
import { useExposureDevices } from '../hooks/useExposureDevices';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import { usePlaceStays } from '../hooks/usePlaceStays';
import { toHkDateKey } from '../utils/hkDate';
import { formatDuration } from '../utils/exposureFormat';
import { getHeatIndexInfo } from '../utils/heatIndexUtils';
import { getAqhiInfo } from '../utils/aqhiUtils';
import { formatHazardValue } from '../utils/hazardLevels';
import { openPlace } from '../services/navigationBus';
import { EXPOSURE_SCREEN_COPY } from '../config/exposureScreenConfig';
import { HAZARD_KINDS } from '../config/alertConfig';
import { ExposureDevice } from '../types/exposure';
import { HazardKind } from '../types/alerts';

const ACCENT = '#8B5CF6';

// Each hazard's own level color — the same tables the cards, map and
// legends read.
const PEAK_COLOR: Record<HazardKind, (value: number) => string> = {
  heat: value => getHeatIndexInfo(value).color,
  aqhi: value => getAqhiInfo(value).color,
};

// "● Heat index up to 34°C" — the highest value during the stays, in its
// level color; "Heat index --" (no dot) when unavailable.
const StayPeak = ({ hazard, value }: { hazard: HazardKind; value: number | null }) => {
  const name = EXPOSURE_SCREEN_COPY.hazardNames[hazard];
  return (
    <View style={styles.peak}>
      {value !== null && (
        <View style={[styles.peakDot, { backgroundColor: PEAK_COLOR[hazard](value) }]} />
      )}
      <Text style={styles.peakText}>
        {value === null
          ? EXPOSURE_SCREEN_COPY.stayPeakUnavailable(name)
          : EXPOSURE_SCREEN_COPY.stayPeak(name, formatHazardValue(hazard, value))}
      </Text>
    </View>
  );
};

const ExposureScreen = () => {
  const { enabled: trackingEnabled, setEnabled: setTrackingEnabled } =
    useExposureTrackingSettings();
  const {
    report: todayReport,
    loading: todayLoading,
    refresh: refreshToday,
  } = useTodayExposure(trackingEnabled);
  const { history, refresh: refreshHistory } = useExposureHistory();
  const { devices, removeDevice, refresh: refreshDevices } = useExposureDevices();
  const placeStays = usePlaceStays(trackingEnabled ? todayReport : null);

  const handleRefresh = useCallback(
    () => Promise.all([refreshToday(), refreshHistory(), refreshDevices()]).then(() => {}),
    [refreshToday, refreshHistory, refreshDevices],
  );
  const { refreshing, onRefresh } = usePullToRefresh(handleRefresh);

  const todayKey = useMemo(() => toHkDateKey(), []);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [liveDetailOpen, setLiveDetailOpen] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<ExposureDevice | null>(null);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ACCENT} colors={[ACCENT]} />
        }
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{EXPOSURE_SCREEN_COPY.title}</Text>
          <TouchableOpacity style={styles.addButton} onPress={() => setAddModalOpen(true)}>
            <Plus size={22} color="#fff" />
          </TouchableOpacity>
        </View>

        <ImportProgressBanner />

        <Text style={styles.sectionLabel}>{EXPOSURE_SCREEN_COPY.myDayTitle}</Text>
        {!trackingEnabled ? (
          // The same switch as App settings (one hook, one stored flag), so
          // the user can start here instead of being sent elsewhere.
          <View style={styles.emptyCard}>
            <Footprints size={28} color="#8E8E93" />
            <Text style={styles.emptyText}>{EXPOSURE_SCREEN_COPY.trackingOffText}</Text>
            <TouchableOpacity
              style={styles.startButton}
              onPress={() => setTrackingEnabled(true)}
              accessibilityRole="button"
            >
              <Text style={styles.startButtonText}>{EXPOSURE_SCREEN_COPY.startTracking}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.todayCard}>
            <TouchableOpacity
              style={styles.todayRow}
              onPress={() => setLiveDetailOpen(true)}
              activeOpacity={0.7}
            >
              <View style={styles.todayTextContainer}>
                <Text style={styles.todayValue}>
                  {todayReport ? todayReport.totalExposure.toFixed(2) : '—'}
                </Text>
                <Text style={styles.todaySubtitle}>
                  {todayLoading && !todayReport
                    ? EXPOSURE_SCREEN_COPY.calculating
                    : EXPOSURE_SCREEN_COPY.todayLabel}
                </Text>
              </View>
              <ChevronRight size={20} color="#8E8E93" />
            </TouchableOpacity>

            {/* Where the day was spent, with both hazards in their level
                colors — a place name leads to that place in Places. */}
            {placeStays.length > 0 && (
              <View style={styles.placesBlock}>
                <Text style={styles.placesHeading}>{EXPOSURE_SCREEN_COPY.placesHeading}</Text>
                {placeStays.map(stay => (
                  <TouchableOpacity
                    key={stay.placeId}
                    style={styles.placeRow}
                    onPress={() => openPlace(stay.placeId)}
                    accessibilityRole="button"
                  >
                    <View style={styles.placeText}>
                      <Text style={styles.placeName} numberOfLines={1}>
                        {stay.label}
                        <Text style={styles.placeDuration}>
                          {'  '}
                          {formatDuration(stay.durationMs)}
                        </Text>
                      </Text>
                      <View style={styles.peakRow}>
                        {HAZARD_KINDS.map(hazard => (
                          <StayPeak key={hazard} hazard={hazard} value={stay.peaks[hazard]} />
                        ))}
                      </View>
                    </View>
                    <ChevronRight size={18} color="#BBB" />
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}

        <Text style={styles.sectionLabel}>{EXPOSURE_SCREEN_COPY.importedTitle}</Text>
        {devices.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>{EXPOSURE_SCREEN_COPY.importedEmpty}</Text>
          </View>
        ) : (
          devices.map(device => (
            <DeviceCard
              key={device.id}
              device={device}
              onPress={() => setSelectedDevice(device)}
            />
          ))
        )}
      </ScrollView>

      <ImportTrackModal
        visible={addModalOpen}
        onClose={() => setAddModalOpen(false)}
      />
      <LiveDeviceDetailModal
        visible={liveDetailOpen}
        onClose={() => setLiveDetailOpen(false)}
        todayKey={todayKey}
        todayReport={todayReport}
        todayLoading={todayLoading}
        history={history}
        refresh={handleRefresh}
      />
      <DeviceDetailModal
        visible={!!selectedDevice}
        device={selectedDevice}
        onClose={() => setSelectedDevice(null)}
        onDelete={id => {
          removeDevice(id);
          setSelectedDevice(null);
        }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F5F5F5' },
  scrollContent: { padding: 20, paddingBottom: 140 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#333',
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8E8E93',
    letterSpacing: 0.5,
    marginBottom: 10,
    marginTop: 8,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
  },
  emptyText: { fontSize: 13, color: '#8E8E93', textAlign: 'center' },
  startButton: {
    backgroundColor: ACCENT,
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginTop: 4,
  },
  startButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  todayCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  todayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  todayTextContainer: { flex: 1 },
  todayValue: { fontSize: 28, fontWeight: '700', color: '#1C1C1E' },
  todaySubtitle: { fontSize: 12, color: '#8E8E93', marginTop: 4 },
  placesBlock: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E2E2E2',
  },
  placesHeading: { fontSize: 12, fontWeight: '700', color: '#8E8E93', marginBottom: 4 },
  placeRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, gap: 8 },
  placeText: { flex: 1 },
  placeName: { fontSize: 15, fontWeight: '600', color: '#1C1C1E' },
  placeDuration: { fontSize: 13, fontWeight: '500', color: '#8E8E93' },
  peakRow: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 14, rowGap: 2, marginTop: 2 },
  peak: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  peakDot: { width: 8, height: 8, borderRadius: 4 },
  peakText: { fontSize: 12, color: '#555' },
});

export default ExposureScreen;
