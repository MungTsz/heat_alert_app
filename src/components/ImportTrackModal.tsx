// src/components/ImportTrackModal.tsx
import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Upload, Link as LinkIcon, Share2 } from 'lucide-react-native';
import { pick, types, isErrorWithCode, errorCodes } from '@react-native-documents/picker';
import Share from 'react-native-share';
import { parseGeoJsonTrack } from '../utils/gpsTrackParser';
import { buildExposureReportCsv } from '../utils/exportExposureReport';
import { useExposureReport } from '../hooks/useExposureReport';
import ExposureReportView from './ExposureReportView';

type Props = {
  visible: boolean;
  onClose: () => void;
};

const ImportTrackModal: React.FC<Props> = ({ visible, onClose }) => {
  const insets = useSafeAreaInsets();
  const { report, loading, error, generate, reset } = useExposureReport();
  const [url, setUrl] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const handleTrackJson = async (text: string) => {
    setLocalError(null);
    try {
      const json = JSON.parse(text);
      const points = parseGeoJsonTrack(json);
      if (points.length === 0) {
        setLocalError('No valid GPS points found in that file.');
        return;
      }
      await generate(points);
    } catch (err) {
      setLocalError(
        err instanceof Error ? err.message : 'Failed to parse track data.',
      );
    }
  };

  const handlePickFile = async () => {
    try {
      const [file] = await pick({ type: [types.allFiles] });
      const text = await (await fetch(file.uri)).text();
      await handleTrackJson(text);
    } catch (err) {
      if (isErrorWithCode(err) && err.code === errorCodes.OPERATION_CANCELED) return;
      setLocalError('Could not read the selected file.');
    }
  };

  const handleImportUrl = async () => {
    if (!url.trim()) return;
    try {
      const text = await (await fetch(url.trim())).text();
      await handleTrackJson(text);
    } catch {
      setLocalError('Could not fetch the track from that URL.');
    }
  };

  const handleExport = async () => {
    if (!report) return;
    const csv = buildExposureReportCsv(report);
    // Shared as plain text rather than a base64 file URL — every share
    // target (Mail, Messages, Files, etc.) accepts a text message, and this
    // avoids pulling in a filesystem library just to write a temp file.
    await Share.open({
      title: 'Exposure Report',
      message: csv,
      failOnCancel: false,
    });
  };

  const handleReset = () => {
    reset();
    setLocalError(null);
    setUrl('');
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const displayError = localError ?? error;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Import GPS Track</Text>
          <TouchableOpacity onPress={handleClose} hitSlop={10}>
            <X size={22} color="#333" />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          {!report && !loading && (
            <>
              <TouchableOpacity style={styles.actionRow} onPress={handlePickFile}>
                <Upload size={18} color="#333" />
                <Text style={styles.actionText}>Upload File (.geojson/.json)</Text>
              </TouchableOpacity>

              <Text style={styles.orText}>or</Text>

              <View style={styles.urlRow}>
                <LinkIcon size={16} color="#8E8E93" style={styles.urlIcon} />
                <TextInput
                  style={styles.urlInput}
                  placeholder="https://.../track.geojson"
                  placeholderTextColor="#8E8E93"
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={url}
                  onChangeText={setUrl}
                />
              </View>
              <TouchableOpacity
                style={[styles.actionRow, !url.trim() && styles.actionRowDisabled]}
                onPress={handleImportUrl}
                disabled={!url.trim()}
              >
                <Text style={styles.actionText}>Import from URL</Text>
              </TouchableOpacity>

              {displayError && <Text style={styles.errorText}>{displayError}</Text>}
            </>
          )}

          {loading && (
            <ActivityIndicator style={styles.loadingIndicator} size="large" />
          )}

          {report && !loading && (
            <>
              <ExposureReportView report={report} title="Imported Track Exposure" />
              <View style={styles.footerRow}>
                <TouchableOpacity style={styles.footerButton} onPress={handleReset}>
                  <Text style={styles.footerButtonText}>Import Another</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.footerButton, styles.exportButton]}
                  onPress={handleExport}
                >
                  <Share2 size={16} color="#fff" />
                  <Text style={[styles.footerButtonText, styles.exportButtonText]}>
                    Export
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          )}
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
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#1C1C1E' },
  content: { padding: 20, paddingBottom: 60 },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 14,
    marginBottom: 12,
  },
  actionRowDisabled: { opacity: 0.5 },
  actionText: { fontSize: 14, fontWeight: '600', color: '#333' },
  orText: {
    textAlign: 'center',
    color: '#8E8E93',
    fontSize: 12,
    marginBottom: 12,
  },
  urlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  urlIcon: { marginRight: 8 },
  urlInput: { flex: 1, paddingVertical: 12, fontSize: 14, color: '#1C1C1E' },
  errorText: {
    color: '#D9534F',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 10,
  },
  loadingIndicator: { marginVertical: 40 },
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
  footerButtonText: { fontSize: 14, fontWeight: '700', color: '#333' },
  exportButtonText: { color: '#fff' },
});

export default ImportTrackModal;
