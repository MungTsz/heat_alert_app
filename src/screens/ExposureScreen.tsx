// src/screens/ExposureScreen.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Footprints, Upload } from 'lucide-react-native';
import ExposureReportView from '../components/ExposureReportView';
import ImportTrackModal from '../components/ImportTrackModal';
import { useTodayExposure } from '../hooks/useTodayExposure';
import { useExposureTrackingSettings } from '../hooks/useExposureTrackingSettings';

const ExposureScreen = () => {
  const { enabled: trackingEnabled } = useExposureTrackingSettings();
  const { report, loading } = useTodayExposure(trackingEnabled);
  const [importModalOpen, setImportModalOpen] = useState(false);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.headerTitle}>Exposure</Text>

        <Text style={styles.sectionLabel}>TODAY</Text>
        {!trackingEnabled ? (
          <View style={styles.emptyCard}>
            <Footprints size={28} color="#8E8E93" />
            <Text style={styles.emptyText}>
              Turn on background exposure tracking in Settings to see today's
              spatial-temporal exposure here.
            </Text>
          </View>
        ) : loading && !report ? (
          <ActivityIndicator style={styles.loadingIndicator} />
        ) : report ? (
          <ExposureReportView report={report} title="Today's Exposure" />
        ) : null}

        <Text style={styles.sectionLabel}>IMPORT A TRACK</Text>
        <TouchableOpacity
          style={styles.importCard}
          onPress={() => setImportModalOpen(true)}
        >
          <Upload size={20} color="#333" />
          <View style={styles.importTextContainer}>
            <Text style={styles.importTitle}>Import GPS Track</Text>
            <Text style={styles.importSubtitle}>
              Upload a GeoJSON file or paste a link to calculate exposure for
              any track
            </Text>
          </View>
        </TouchableOpacity>
      </ScrollView>

      <ImportTrackModal
        visible={importModalOpen}
        onClose={() => setImportModalOpen(false)}
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
  loadingIndicator: { marginVertical: 30 },
  importCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  importTextContainer: { flex: 1 },
  importTitle: { fontSize: 15, fontWeight: '700', color: '#1C1C1E' },
  importSubtitle: { fontSize: 12, color: '#8E8E93', marginTop: 2 },
});

export default ExposureScreen;
