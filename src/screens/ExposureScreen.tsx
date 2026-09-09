// src/screens/ExposureScreen.tsx
import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Footprints, Upload, Calendar as CalendarIcon } from 'lucide-react-native';
import ExposureDateScopedView from '../components/ExposureDateScopedView';
import ExposureDatePickerModal, {
  DateSelection,
} from '../components/ExposureDatePickerModal';
import ImportTrackModal from '../components/ImportTrackModal';
import ImportHistoryCard from '../components/ImportHistoryCard';
import ImportHistoryDetailModal from '../components/ImportHistoryDetailModal';
import DeviceCard from '../components/DeviceCard';
import DeviceDetailModal from '../components/DeviceDetailModal';
import { useTodayExposure } from '../hooks/useTodayExposure';
import { useExposureTrackingSettings } from '../hooks/useExposureTrackingSettings';
import { useExposureHistory } from '../hooks/useExposureHistory';
import { useImportHistory } from '../hooks/useImportHistory';
import { useExposureDevices } from '../hooks/useExposureDevices';
import { toHkDateKey } from '../utils/hkDate';
import { ImportHistoryEntry, ExposureDevice } from '../types/exposure';

const formatDateLabel = (dateKey: string, todayKey: string): string => {
  if (dateKey === todayKey) return 'Today';
  return new Date(`${dateKey}T00:00:00`).toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
  });
};

const ExposureScreen = () => {
  const { enabled: trackingEnabled } = useExposureTrackingSettings();
  const { report: todayReport, loading: todayLoading } = useTodayExposure(trackingEnabled);
  const { history } = useExposureHistory();
  const { imports, removeImport } = useImportHistory();
  const { devices, removeDevice } = useExposureDevices();

  const todayKey = useMemo(() => toHkDateKey(), []);
  const [selection, setSelection] = useState<DateSelection>({
    mode: 'single',
    date: todayKey,
  });
  const [pickerOpen, setPickerOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [selectedImport, setSelectedImport] = useState<ImportHistoryEntry | null>(null);
  const [selectedDevice, setSelectedDevice] = useState<ExposureDevice | null>(null);

  const selectionLabel =
    selection.mode === 'single'
      ? formatDateLabel(selection.date, todayKey)
      : `${formatDateLabel(selection.start, todayKey)} – ${formatDateLabel(selection.end, todayKey)}`;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.headerTitle}>Exposure</Text>

        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionLabel}>DAILY EXPOSURE</Text>
          <TouchableOpacity
            style={styles.datePill}
            onPress={() => setPickerOpen(true)}
          >
            <CalendarIcon size={14} color="#8B5CF6" />
            <Text style={styles.datePillText}>{selectionLabel}</Text>
          </TouchableOpacity>
        </View>

        {!trackingEnabled ? (
          <View style={styles.emptyCard}>
            <Footprints size={28} color="#8E8E93" />
            <Text style={styles.emptyText}>
              Turn on background exposure tracking in Settings to see your
              daily spatial-temporal exposure here.
            </Text>
          </View>
        ) : (
          <ExposureDateScopedView
            history={history}
            selection={selection}
            todayKey={todayKey}
            todayReport={todayReport}
            todayLoading={todayLoading}
            formatDateLabel={date => formatDateLabel(date, todayKey)}
          />
        )}

        <Text style={styles.sectionLabel}>IMPORT A TRACK</Text>
        <TouchableOpacity
          style={styles.importCard}
          onPress={() => setImportModalOpen(true)}
        >
          <Upload size={20} color="#333" />
          <View style={styles.importTextContainer}>
            <Text style={styles.importTitle}>Import GPS Track</Text>
            <Text style={styles.importSubtitle}>
              Upload up to 3 GeoJSON files or paste a link to calculate
              exposure for any track
            </Text>
          </View>
        </TouchableOpacity>

        <Text style={styles.sectionLabel}>IMPORT HISTORY</Text>
        {imports.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>
              Imported tracks will appear here so you can revisit them later.
            </Text>
          </View>
        ) : (
          imports.map(entry => (
            <ImportHistoryCard
              key={entry.id}
              sourceLabel={entry.sourceLabel}
              importedAt={entry.importedAt}
              totalExposure={entry.report.totalExposure}
              onPress={() => setSelectedImport(entry)}
              onRemove={() => removeImport(entry.id)}
            />
          ))
        )}

        <Text style={styles.sectionLabel}>DEVICES</Text>
        {devices.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>
              Create a device workspace while importing a track to browse
              another id's data by date, separately from your own.
            </Text>
          </View>
        ) : (
          devices.map(device => (
            <DeviceCard
              key={device.id}
              device={device}
              onPress={() => setSelectedDevice(device)}
              onRemove={() => removeDevice(device.id)}
            />
          ))
        )}
      </ScrollView>

      <ExposureDatePickerModal
        visible={pickerOpen}
        initialSelection={selection}
        onClose={() => setPickerOpen(false)}
        onApply={setSelection}
      />
      <ImportTrackModal
        visible={importModalOpen}
        onClose={() => setImportModalOpen(false)}
      />
      <ImportHistoryDetailModal
        visible={!!selectedImport}
        entry={selectedImport}
        onClose={() => setSelectedImport(null)}
        onDelete={removeImport}
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
  headerTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 10,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8E8E93',
    letterSpacing: 0.5,
    marginBottom: 10,
    marginTop: 8,
  },
  datePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F0EBFF',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  datePillText: { fontSize: 13, fontWeight: '700', color: '#8B5CF6' },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
  },
  emptyText: { fontSize: 13, color: '#8E8E93', textAlign: 'center' },
  importCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  importTextContainer: { flex: 1 },
  importTitle: { fontSize: 15, fontWeight: '700', color: '#1C1C1E' },
  importSubtitle: { fontSize: 12, color: '#8E8E93', marginTop: 2 },
});

export default ExposureScreen;
