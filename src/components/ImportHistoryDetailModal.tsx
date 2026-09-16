// src/components/ImportHistoryDetailModal.tsx
import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Trash2, Share2 } from 'lucide-react-native';
import Share from 'react-native-share';
import { ExposureReport, ImportHistoryEntry } from '../types/exposure';
import { exposureDataProvider } from '../data/exposure';
import { buildExposureReportCsv } from '../utils/exportExposureReport';
import ExposureDaySwitcher from './ExposureDaySwitcher';

type Props = {
  visible: boolean;
  entry: ImportHistoryEntry | null;
  onClose: () => void;
  onDelete: (id: string) => void;
};

const ImportHistoryDetailModal: React.FC<Props> = ({
  visible,
  entry,
  onClose,
  onDelete,
}) => {
  const insets = useSafeAreaInsets();
  const [report, setReport] = useState<ExposureReport | null>(null);
  const [loading, setLoading] = useState(false);

  // The report is no longer embedded in the entry — it's re-fetched from the
  // backend by the pid this import was ingested under, since that backend is
  // now the source of truth for what got calculated.
  useEffect(() => {
    if (!visible || !entry) {
      setReport(null);
      return;
    }
    setLoading(true);
    exposureDataProvider
      .getHourlyReport(entry.previewPid)
      .then(setReport)
      .catch(() => setReport(null))
      .finally(() => setLoading(false));
  }, [visible, entry]);

  if (!entry) return null;

  const handleExport = async () => {
    if (!report) return;
    const csv = buildExposureReportCsv(report);
    await Share.open({ title: 'Exposure Report', message: csv, failOnCancel: false });
  };

  const handleDelete = () => {
    onDelete(entry.id);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {entry.sourceLabel}
          </Text>
          <TouchableOpacity onPress={onClose} hitSlop={10}>
            <X size={22} color="#333" />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          {loading || !report ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator style={styles.loadingIndicator} />
              <Text style={styles.loadingText}>Loading exposure…</Text>
            </View>
          ) : (
            <ExposureDaySwitcher report={report} title="Imported Track Exposure" />
          )}

          <View style={styles.footerRow}>
            <TouchableOpacity style={styles.footerButton} onPress={handleDelete}>
              <Trash2 size={16} color="#333" />
              <Text style={styles.footerButtonText}>Delete</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.footerButton, styles.exportButton, !report && styles.exportButtonDisabled]}
              onPress={handleExport}
              disabled={!report}
            >
              <Share2 size={16} color="#fff" />
              <Text style={[styles.footerButtonText, styles.exportButtonText]}>Export</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 12,
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#1C1C1E', flexShrink: 1 },
  content: { padding: 20, paddingBottom: 60 },
  loadingBox: { alignItems: 'center', marginVertical: 30 },
  loadingIndicator: { marginBottom: 10 },
  loadingText: { fontSize: 13, color: '#8E8E93' },
  footerRow: { flexDirection: 'row', gap: 10, marginTop: 8 },
  footerButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  exportButton: { backgroundColor: '#D9534F' },
  exportButtonDisabled: { opacity: 0.5 },
  footerButtonText: { fontSize: 14, fontWeight: '700', color: '#333' },
  exportButtonText: { color: '#fff' },
});

export default ImportHistoryDetailModal;
