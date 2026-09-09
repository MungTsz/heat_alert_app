// src/screens/ExposureScreen.tsx
import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Footprints, ChevronRight, Plus } from 'lucide-react-native';
import ImportTrackModal from '../components/ImportTrackModal';
import DeviceCard from '../components/DeviceCard';
import DeviceDetailModal from '../components/DeviceDetailModal';
import LiveDeviceDetailModal from '../components/LiveDeviceDetailModal';
import { useTodayExposure } from '../hooks/useTodayExposure';
import { useExposureTrackingSettings } from '../hooks/useExposureTrackingSettings';
import { useExposureHistory } from '../hooks/useExposureHistory';
import { useExposureDevices } from '../hooks/useExposureDevices';
import { toHkDateKey } from '../utils/hkDate';
import { ExposureDevice } from '../types/exposure';

const ExposureScreen = () => {
  const { enabled: trackingEnabled } = useExposureTrackingSettings();
  const { report: todayReport, loading: todayLoading } = useTodayExposure(trackingEnabled);
  const { history } = useExposureHistory();
  const { devices, removeDevice } = useExposureDevices();

  const todayKey = useMemo(() => toHkDateKey(), []);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [liveDetailOpen, setLiveDetailOpen] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<ExposureDevice | null>(null);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Exposure</Text>
          <TouchableOpacity style={styles.addButton} onPress={() => setAddModalOpen(true)}>
            <Plus size={22} color="#fff" />
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionLabel}>THIS DEVICE</Text>
        {!trackingEnabled ? (
          <View style={styles.emptyCard}>
            <Footprints size={28} color="#8E8E93" />
            <Text style={styles.emptyText}>
              Turn on background exposure tracking in Settings to see your
              daily spatial-temporal exposure here.
            </Text>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.todayCard}
            onPress={() => setLiveDetailOpen(true)}
            activeOpacity={0.7}
          >
            <View style={styles.todayTextContainer}>
              <Text style={styles.todayValue}>
                {todayReport ? todayReport.totalExposure.toFixed(2) : '—'}
              </Text>
              <Text style={styles.todaySubtitle}>
                {todayLoading && !todayReport
                  ? 'Calculating…'
                  : "Today's exposure (%AR·h)"}
              </Text>
            </View>
            <ChevronRight size={20} color="#8E8E93" />
          </TouchableOpacity>
        )}

        <Text style={styles.sectionLabel}>DEVICES</Text>
        {devices.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>
              Tap + to import a track and create a device workspace to
              browse another id's data by date, separately from your own.
            </Text>
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
    backgroundColor: '#8B5CF6',
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
  todayCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  todayTextContainer: { flex: 1 },
  todayValue: { fontSize: 28, fontWeight: '700', color: '#1C1C1E' },
  todaySubtitle: { fontSize: 12, color: '#8E8E93', marginTop: 4 },
});

export default ExposureScreen;
