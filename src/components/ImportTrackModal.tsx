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
import {
  X,
  Upload,
  Link as LinkIcon,
  ChevronDown,
  ChevronUp,
  Plus,
} from 'lucide-react-native';
import { pick, types, isErrorWithCode, errorCodes } from '@react-native-documents/picker';
import { parseGeoJsonTrack } from '../utils/gpsTrackParser';
import { useExposureReport, DEFAULT_PID } from '../hooks/useExposureReport';
import { useImportHistory } from '../hooks/useImportHistory';
import { useExposureDevices } from '../hooks/useExposureDevices';
import { splitExposureReportByDay } from '../utils/splitReportByDay';
import { saveDailyExposureReport } from '../services/exposureHistoryService';
import { ExposureReport } from '../types/exposure';
import ExposureDaySwitcher from './ExposureDaySwitcher';

type Props = {
  visible: boolean;
  onClose: () => void;
};

const MAX_FILES = 3;

type ImportItem = {
  id: string;
  fileName: string;
  status: 'reading' | 'calculating' | 'done' | 'error';
  report?: ExposureReport;
  error?: string;
  expanded: boolean;
};

const ImportTrackModal: React.FC<Props> = ({ visible, onClose }) => {
  const insets = useSafeAreaInsets();
  const { generate } = useExposureReport();
  const { addImport } = useImportHistory();
  const { devices, createDevice } = useExposureDevices();
  const [url, setUrl] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [items, setItems] = useState<ImportItem[]>([]);
  const [processing, setProcessing] = useState(false);
  const [targetDeviceId, setTargetDeviceId] = useState<string>(DEFAULT_PID);
  const [creatingDevice, setCreatingDevice] = useState(false);
  const [newDeviceName, setNewDeviceName] = useState('');

  const updateItem = (id: string, patch: Partial<ImportItem>) =>
    setItems(prev => prev.map(item => (item.id === id ? { ...item, ...patch } : item)));

  const handleCreateDevice = async () => {
    const name = newDeviceName.trim();
    if (!name) return;
    const device = await createDevice(name);
    setTargetDeviceId(device.id);
    setNewDeviceName('');
    setCreatingDevice(false);
  };

  const processOne = async (id: string, sourceLabel: string, text: string) => {
    updateItem(id, { status: 'reading' });
    let points;
    try {
      points = parseGeoJsonTrack(JSON.parse(text));
    } catch (err) {
      updateItem(id, {
        status: 'error',
        error: err instanceof Error ? err.message : 'Failed to parse track data.',
      });
      return;
    }
    if (points.length === 0) {
      updateItem(id, { status: 'error', error: 'No valid GPS points found in that file.' });
      return;
    }
    updateItem(id, { status: 'calculating' });
    try {
      const report = await generate(points, targetDeviceId);
      updateItem(id, { status: 'done', report });
      await addImport(sourceLabel, report);
      if (targetDeviceId !== DEFAULT_PID) {
        // Feeds this device workspace's own browsable per-day history
        // (accumulating across imports — see exposureHistoryService.ts's
        // merge-on-save behavior), in addition to the flat Import History
        // entry every import gets regardless of device.
        for (const { date, report: dayReport } of splitExposureReportByDay(report)) {
          await saveDailyExposureReport(date, dayReport, targetDeviceId);
        }
      }
    } catch (err) {
      updateItem(id, {
        status: 'error',
        error: err instanceof Error ? err.message : 'Failed to calculate exposure.',
      });
    }
  };

  const handlePickFiles = async () => {
    setLocalError(null);
    try {
      const picked = await pick({ type: [types.allFiles], allowMultiSelection: true });
      if (picked.length > MAX_FILES) {
        setLocalError(`Only the first ${MAX_FILES} files were imported.`);
      }
      const toImport = picked.slice(0, MAX_FILES);

      const newItems: ImportItem[] = toImport.map((file, i) => ({
        id: `${Date.now()}-${i}`,
        fileName: file.name ?? 'Untitled track',
        status: 'reading',
        expanded: false,
      }));
      setItems(prev => [...prev, ...newItems]);

      setProcessing(true);
      // Sequential, not parallel — each file's exposure calculation is a
      // real network call, and sequential keeps batching/URL-length
      // behavior predictable rather than firing several batches at once.
      for (let i = 0; i < toImport.length; i++) {
        const file = toImport[i];
        const item = newItems[i];
        try {
          const text = await (await fetch(file.uri)).text();
          await processOne(item.id, item.fileName, text);
        } catch {
          updateItem(item.id, { status: 'error', error: 'Could not read the selected file.' });
        }
      }
      setProcessing(false);
    } catch (err) {
      if (isErrorWithCode(err) && err.code === errorCodes.OPERATION_CANCELED) return;
      setLocalError('Could not open the file picker.');
    }
  };

  const handleImportUrl = async () => {
    if (!url.trim()) return;
    const sourceLabel = url.trim();
    const id = `${Date.now()}-url`;
    setItems(prev => [
      ...prev,
      { id, fileName: sourceLabel, status: 'reading', expanded: false },
    ]);
    setUrl('');
    setProcessing(true);
    try {
      const text = await (await fetch(sourceLabel)).text();
      await processOne(id, sourceLabel, text);
    } catch {
      updateItem(id, { status: 'error', error: 'Could not fetch the track from that URL.' });
    }
    setProcessing(false);
  };

  const toggleExpanded = (id: string) =>
    setItems(prev =>
      prev.map(item => (item.id === id ? { ...item, expanded: !item.expanded } : item)),
    );

  const handleReset = () => {
    setItems([]);
    setLocalError(null);
    setUrl('');
    setTargetDeviceId(DEFAULT_PID);
    setCreatingDevice(false);
    setNewDeviceName('');
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleClose}>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Import GPS Track</Text>
          <TouchableOpacity onPress={handleClose} hitSlop={10}>
            <X size={22} color="#333" />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          {!processing && (
            <>
              <Text style={styles.sectionLabel}>IMPORT TO</Text>
              <View style={styles.deviceChipRow}>
                <TouchableOpacity
                  style={[styles.deviceChip, targetDeviceId === DEFAULT_PID && styles.deviceChipActive]}
                  onPress={() => setTargetDeviceId(DEFAULT_PID)}
                >
                  <Text
                    style={[
                      styles.deviceChipText,
                      targetDeviceId === DEFAULT_PID && styles.deviceChipTextActive,
                    ]}
                  >
                    This device
                  </Text>
                </TouchableOpacity>
                {devices.map(device => (
                  <TouchableOpacity
                    key={device.id}
                    style={[styles.deviceChip, targetDeviceId === device.id && styles.deviceChipActive]}
                    onPress={() => setTargetDeviceId(device.id)}
                  >
                    <Text
                      style={[
                        styles.deviceChipText,
                        targetDeviceId === device.id && styles.deviceChipTextActive,
                      ]}
                      numberOfLines={1}
                    >
                      {device.name}
                    </Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  style={styles.deviceChip}
                  onPress={() => setCreatingDevice(true)}
                >
                  <Plus size={14} color="#8B5CF6" />
                  <Text style={[styles.deviceChipText, styles.deviceChipTextAccent]}>
                    New device
                  </Text>
                </TouchableOpacity>
              </View>

              {creatingDevice && (
                <View style={styles.urlRow}>
                  <TextInput
                    style={styles.urlInput}
                    placeholder="Device name, e.g. Mom's phone"
                    placeholderTextColor="#8E8E93"
                    value={newDeviceName}
                    onChangeText={setNewDeviceName}
                    autoFocus
                  />
                  <TouchableOpacity
                    onPress={handleCreateDevice}
                    disabled={!newDeviceName.trim()}
                    hitSlop={10}
                  >
                    <Text
                      style={[
                        styles.createDeviceConfirm,
                        !newDeviceName.trim() && styles.actionRowDisabled,
                      ]}
                    >
                      Create
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              <TouchableOpacity style={styles.actionRow} onPress={handlePickFiles}>
                <Upload size={18} color="#333" />
                <Text style={styles.actionText}>
                  Upload Files (up to {MAX_FILES}, .geojson/.json)
                </Text>
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

              {localError && <Text style={styles.errorText}>{localError}</Text>}
            </>
          )}

          {items.map(item => (
            <View key={item.id} style={styles.itemCard}>
              {(item.status === 'reading' || item.status === 'calculating') && (
                <View style={styles.itemProgressRow}>
                  <ActivityIndicator size="small" />
                  <View style={styles.itemProgressText}>
                    <Text style={styles.itemFileName} numberOfLines={1}>
                      {item.fileName}
                    </Text>
                    <Text style={styles.itemStatusText}>
                      {item.status === 'reading' ? 'Reading track…' : 'Calculating exposure…'}
                    </Text>
                  </View>
                </View>
              )}

              {item.status === 'error' && (
                <View>
                  <Text style={styles.itemFileName} numberOfLines={1}>
                    {item.fileName}
                  </Text>
                  <Text style={styles.errorText}>{item.error}</Text>
                </View>
              )}

              {item.status === 'done' && item.report && (
                <View>
                  <TouchableOpacity
                    style={styles.itemSummaryRow}
                    onPress={() => toggleExpanded(item.id)}
                  >
                    <View style={styles.itemProgressText}>
                      <Text style={styles.itemFileName} numberOfLines={1}>
                        {item.fileName}
                      </Text>
                      <Text style={styles.itemStatusText}>
                        {item.report.totalExposure.toFixed(2)} %AR·h total
                      </Text>
                    </View>
                    {item.expanded ? (
                      <ChevronUp size={18} color="#8E8E93" />
                    ) : (
                      <ChevronDown size={18} color="#8E8E93" />
                    )}
                  </TouchableOpacity>
                  {item.expanded && (
                    <View style={styles.itemExpanded}>
                      <ExposureDaySwitcher
                        report={item.report}
                        title="Imported Track Exposure"
                      />
                    </View>
                  )}
                </View>
              )}
            </View>
          ))}

          {items.length > 0 && !processing && (
            <TouchableOpacity style={styles.footerButton} onPress={handleReset}>
              <Text style={styles.footerButtonText}>Import More</Text>
            </TouchableOpacity>
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
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8E8E93',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  deviceChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  deviceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 14,
    maxWidth: 160,
  },
  deviceChipActive: { backgroundColor: '#8B5CF6' },
  deviceChipText: { fontSize: 13, fontWeight: '600', color: '#333' },
  deviceChipTextActive: { color: '#FFFFFF' },
  deviceChipTextAccent: { color: '#8B5CF6' },
  createDeviceConfirm: {
    fontSize: 13,
    fontWeight: '700',
    color: '#8B5CF6',
    paddingHorizontal: 12,
  },
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
  itemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  itemProgressRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  itemSummaryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  itemProgressText: { flex: 1 },
  itemFileName: { fontSize: 14, fontWeight: '600', color: '#1C1C1E' },
  itemStatusText: { fontSize: 12, color: '#8E8E93', marginTop: 2 },
  itemExpanded: { marginTop: 14 },
  footerButton: {
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    marginTop: 4,
  },
  footerButtonText: { fontSize: 14, fontWeight: '700', color: '#333' },
});

export default ImportTrackModal;
