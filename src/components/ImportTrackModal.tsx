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
import { extractGeoJsonFeatures } from '../utils/gpsTrackParser';
import { exposureDataProvider } from '../data/exposure';
import { useImportHistory } from '../hooks/useImportHistory';
import { useExposureDevices } from '../hooks/useExposureDevices';
import { refreshHistoryCache } from '../services/exposureHistoryService';
import { setImportJobStatus, clearImportJobStatus } from '../services/importJobStatusService';
import {
  startImportProgress,
  reportImportFileResult,
  finishImportProgress,
} from '../services/importProgressBus';
import { ExposureReport } from '../types/exposure';
import { EXPOSURE_API_CONFIG } from '../config/exposureApiConfig';
import ExposureDaySwitcher from './ExposureDaySwitcher';

type Props = {
  visible: boolean;
  onClose: () => void;
  // When set, this modal is opened from a specific device workspace's own
  // page (see DeviceDetailModal) — the device-target chip row is hidden and
  // every import goes straight to that device, no picking/creating needed.
  lockedDeviceId?: string;
};

const MAX_FILES = EXPOSURE_API_CONFIG.maxFilesPerImport;
// Sentinel meaning "preview only, don't attach to a device workspace" — the
// ETL backend always persists whatever's ingested under a pid (there's no
// ephemeral/no-save mode), so this path generates a one-off throwaway pid
// per import instead of skipping the network call. It's logged in the flat
// import history (see useImportHistory) since it's the only way to revisit
// it later, unlike a device import which stays browsable via its own
// device workspace.
const INSTANT_TARGET = '__instant__';

const makePreviewPid = (): string =>
  `preview-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

// A picked file or submitted URL that the user hasn't committed to yet —
// tracked separately from ImportItem so nothing hits the network (and the
// slow ETL backend) until the user explicitly confirms the batch.
type PendingSource = {
  id: string;
  label: string;
  kind: 'file' | 'url';
  uri: string;
};

type ImportItem = {
  id: string;
  fileName: string;
  status: 'reading' | 'calculating' | 'done' | 'error';
  report?: ExposureReport;
  error?: string;
  expanded: boolean;
};

type Phase = 'select' | 'importing' | 'complete';

const ImportTrackModal: React.FC<Props> = ({ visible, onClose, lockedDeviceId }) => {
  const insets = useSafeAreaInsets();
  const { addImport } = useImportHistory();
  const { devices, createDevice } = useExposureDevices();
  const [url, setUrl] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [pendingSources, setPendingSources] = useState<PendingSource[]>([]);
  const [items, setItems] = useState<ImportItem[]>([]);
  const [phase, setPhase] = useState<Phase>('select');
  const [targetDeviceId, setTargetDeviceId] = useState<string>(
    lockedDeviceId ?? INSTANT_TARGET,
  );
  const [creatingDevice, setCreatingDevice] = useState(false);
  const [newDeviceName, setNewDeviceName] = useState('');

  const lockedDevice = lockedDeviceId
    ? devices.find(d => d.id === lockedDeviceId)
    : undefined;

  const total = items.length;
  const doneCount = items.filter(item => item.status === 'done').length;
  const errorCount = items.filter(item => item.status === 'error').length;
  const completedCount = doneCount + errorCount;

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

  // Returns the user-facing error for this file (undefined on success) so
  // the caller can also forward it to the Exposure tab's progress banner.
  const processOne = async (
    id: string,
    sourceLabel: string,
    text: string,
  ): Promise<string | undefined> => {
    updateItem(id, { status: 'reading' });
    let features;
    try {
      features = extractGeoJsonFeatures(JSON.parse(text));
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to parse track data.';
      updateItem(id, { status: 'error', error });
      return error;
    }
    if (features.length === 0) {
      const error = 'No valid GPS points found in that file.';
      updateItem(id, { status: 'error', error });
      return error;
    }
    updateItem(id, { status: 'calculating' });
    const isInstant = targetDeviceId === INSTANT_TARGET;
    const pid = isInstant ? makePreviewPid() : targetDeviceId;
    try {
      await exposureDataProvider.ingest(pid, features);
      const report = await exposureDataProvider.getHourlyReport(pid);
      updateItem(id, { status: 'done', report });
      if (isInstant) {
        // Not tied to any device workspace, so the import log is the only
        // way to revisit it later — stores the throwaway pid, not the
        // report itself, since the backend is now the source of truth.
        await addImport(sourceLabel, pid);
      }
      // Device imports re-cache their history once after the whole batch
      // (see handleConfirmImport), not per file — files now run in parallel.
      return undefined;
    } catch (err) {
      // ExposureApiError messages are already user-facing (413 too large,
      // batch failed server-side, still queued behind other jobs, …).
      const error = err instanceof Error ? err.message : 'Failed to calculate exposure.';
      updateItem(id, { status: 'error', error });
      return error;
    }
  };

  // Only picks/queues files — nothing is sent to the backend until the user
  // taps "Confirm Import". Lets the user invoke this repeatedly to build up
  // a batch even if the native picker only returns one file per call.
  const handlePickFiles = async () => {
    setLocalError(null);
    const room = Math.max(0, MAX_FILES - pendingSources.length);
    if (room === 0) return;
    try {
      const picked = await pick({ type: [types.allFiles], allowMultiSelection: true });
      if (picked.length > room) {
        setLocalError(
          `Only ${room} more file${room === 1 ? '' : 's'} could be added (max ${MAX_FILES} per import).`,
        );
      }
      const toAdd: PendingSource[] = picked.slice(0, room).map((file, i) => ({
        id: `${Date.now()}-${i}`,
        label: file.name ?? 'Untitled track',
        kind: 'file',
        uri: file.uri,
      }));
      setPendingSources(prev => [...prev, ...toAdd]);
    } catch (err) {
      if (isErrorWithCode(err) && err.code === errorCodes.OPERATION_CANCELED) return;
      setLocalError('Could not open the file picker.');
    }
  };

  // Same idea as handlePickFiles, but for the URL field — just queues it.
  const handleAddUrlSource = () => {
    const trimmed = url.trim();
    if (!trimmed || pendingSources.length >= MAX_FILES) return;
    setPendingSources(prev => [
      ...prev,
      { id: `${Date.now()}-url`, label: trimmed, kind: 'url', uri: trimmed },
    ]);
    setUrl('');
  };

  const removePendingSource = (id: string) =>
    setPendingSources(prev => prev.filter(source => source.id !== id));

  const handleConfirmImport = async () => {
    if (pendingSources.length === 0) return;
    const sources = pendingSources;
    const isInstant = targetDeviceId === INSTANT_TARGET;
    const jobId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const startedAt = Date.now();
    const newItems: ImportItem[] = sources.map(source => ({
      id: source.id,
      fileName: source.label,
      status: 'reading',
      expanded: false,
    }));
    setItems(newItems);
    setPendingSources([]);
    setPhase('importing');
    const targetLabel = isInstant
      ? 'Preview'
      : devices.find(d => d.id === targetDeviceId)?.name ?? 'device';
    startImportProgress(jobId, targetLabel, sources.length);

    // Preview-only imports have no persistent device page to check back on,
    // so there's no job status worth persisting for them — only named
    // devices get one.
    if (!isInstant) {
      await setImportJobStatus(targetDeviceId, {
        jobId,
        total: sources.length,
        completed: 0,
        startedAt,
        updatedAt: startedAt,
      });
    }

    // All files at once (capped at MAX_FILES == the server's concurrent
    // expo_calx limit): /ingest just queues a background batch, and each
    // batch takes ~20-30s regardless of size, so running them in parallel
    // finishes the whole import in about one batch's time instead of N.
    let completed = 0;
    let succeeded = 0;
    await Promise.all(
      sources.map(async source => {
        let fileError: string | undefined;
        try {
          const text = await (await fetch(source.uri)).text();
          fileError = await processOne(source.id, source.label, text);
        } catch {
          fileError =
            source.kind === 'url'
              ? 'Could not fetch the track from that URL.'
              : 'Could not read the selected file.';
          updateItem(source.id, { status: 'error', error: fileError });
        }
        reportImportFileResult(jobId, source.label, fileError);
        completed += 1;
        if (!fileError) succeeded += 1;
        if (!isInstant) {
          await setImportJobStatus(targetDeviceId, {
            jobId,
            total: sources.length,
            completed,
            startedAt,
            updatedAt: Date.now(),
          });
        }
      }),
    );

    if (!isInstant) {
      // Fed into this device workspace's own browsable per-day history — the
      // backend accumulates every file under this pid, so one re-cache after
      // the batch picks them all up (per-file refreshes would race).
      if (succeeded > 0) await refreshHistoryCache(targetDeviceId);
      await clearImportJobStatus(targetDeviceId, jobId);
    }
    finishImportProgress(jobId);
    setPhase('complete');
  };

  const toggleExpanded = (id: string) =>
    setItems(prev =>
      prev.map(item => (item.id === id ? { ...item, expanded: !item.expanded } : item)),
    );

  // "Import More" from the complete screen — starts a fresh selection but
  // deliberately keeps the chosen destination, since the user is continuing
  // the same session rather than starting over.
  const handleImportMore = () => {
    setItems([]);
    setPendingSources([]);
    setLocalError(null);
    setUrl('');
    setCreatingDevice(false);
    setNewDeviceName('');
    setPhase('select');
  };

  const handleFullReset = () => {
    handleImportMore();
    setTargetDeviceId(lockedDeviceId ?? INSTANT_TARGET);
  };

  const handleClose = () => {
    handleFullReset();
    onClose();
  };

  const atFileCap = pendingSources.length >= MAX_FILES;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleClose}>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>
            {lockedDevice ? `Import to ${lockedDevice.name}` : 'Import a Track'}
          </Text>
          <TouchableOpacity onPress={handleClose} hitSlop={10}>
            <X size={22} color="#333" />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          {phase === 'select' && (
            <>
              {!lockedDeviceId && (
                <>
                  <Text style={styles.sectionLabel}>IMPORT TO</Text>
                  <View style={styles.deviceChipRow}>
                    <TouchableOpacity
                      style={[
                        styles.deviceChip,
                        targetDeviceId === INSTANT_TARGET && styles.deviceChipActive,
                      ]}
                      onPress={() => setTargetDeviceId(INSTANT_TARGET)}
                    >
                      <Text
                        style={[
                          styles.deviceChipText,
                          targetDeviceId === INSTANT_TARGET && styles.deviceChipTextActive,
                        ]}
                      >
                        Preview only
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
                </>
              )}

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

              <TouchableOpacity
                style={[styles.actionRow, atFileCap && styles.actionRowDisabled]}
                onPress={handlePickFiles}
                disabled={atFileCap}
              >
                <Upload size={18} color="#333" />
                <Text style={styles.actionText}>Add Files</Text>
              </TouchableOpacity>
              <Text style={styles.helperCaption}>
                .geojson or .json — up to {MAX_FILES} per import, max{' '}
                {Math.round(EXPOSURE_API_CONFIG.maxIngestBodyBytes / (1024 * 1024))} MB each
                (about one day of tracking)
              </Text>

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
                style={[styles.actionRow, (!url.trim() || atFileCap) && styles.actionRowDisabled]}
                onPress={handleAddUrlSource}
                disabled={!url.trim() || atFileCap}
              >
                <Text style={styles.actionText}>Add URL</Text>
              </TouchableOpacity>

              {localError && <Text style={styles.errorText}>{localError}</Text>}

              {pendingSources.length > 0 && (
                <>
                  <Text style={styles.sectionLabel}>
                    READY TO IMPORT ({pendingSources.length})
                  </Text>
                  {pendingSources.map(source => (
                    <View key={source.id} style={styles.pendingRow}>
                      {source.kind === 'url' ? (
                        <LinkIcon size={16} color="#8E8E93" />
                      ) : (
                        <Upload size={16} color="#8E8E93" />
                      )}
                      <Text style={styles.pendingLabel} numberOfLines={1}>
                        {source.label}
                      </Text>
                      <TouchableOpacity
                        onPress={() => removePendingSource(source.id)}
                        hitSlop={10}
                      >
                        <X size={16} color="#8E8E93" />
                      </TouchableOpacity>
                    </View>
                  ))}
                  <TouchableOpacity style={styles.confirmButton} onPress={handleConfirmImport}>
                    <Text style={styles.confirmButtonText}>
                      Confirm Import ({pendingSources.length})
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </>
          )}

          {phase === 'importing' && (
            <>
              <View style={styles.reassuranceBanner}>
                <Text style={styles.reassuranceTitle}>
                  Received {total} file{total === 1 ? '' : 's'} — processing now
                </Text>
                <Text style={styles.reassuranceSubtext}>
                  {targetDeviceId === INSTANT_TARGET
                    ? "This can take a few minutes. Keep this screen open to see each file's results as they finish."
                    : "This can take a few minutes. You can close this and check back on the device later — it'll show your data once it's ready."}
                </Text>
              </View>
              <Text style={styles.progressLabel}>
                {completedCount} of {total} files processed
              </Text>
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${total ? (completedCount / total) * 100 : 0}%` },
                  ]}
                />
              </View>
            </>
          )}

          {phase === 'complete' && (
            <View style={styles.summaryBanner}>
              <Text style={styles.summaryBannerText}>
                {errorCount === 0
                  ? `Imported ${total} of ${total} files`
                  : `${doneCount} of ${total} imported, ${errorCount} failed`}
              </Text>
            </View>
          )}

          {phase !== 'select' &&
            items.map(item => (
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

          {phase === 'complete' && (
            <View style={styles.completeFooterRow}>
              <TouchableOpacity style={styles.footerButton} onPress={handleImportMore}>
                <Text style={styles.footerButtonText}>Import More</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.footerButtonPrimary} onPress={handleClose}>
                <Text style={styles.footerButtonPrimaryText}>Done</Text>
              </TouchableOpacity>
            </View>
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
  helperCaption: {
    fontSize: 12,
    color: '#8E8E93',
    textAlign: 'center',
    marginTop: -6,
    marginBottom: 14,
  },
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
  pendingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  pendingLabel: { flex: 1, fontSize: 14, fontWeight: '600', color: '#1C1C1E' },
  confirmButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8B5CF6',
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 4,
  },
  confirmButtonText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  reassuranceBanner: {
    backgroundColor: '#F0EBFF',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  reassuranceTitle: { fontSize: 14, fontWeight: '700', color: '#1C1C1E' },
  reassuranceSubtext: { fontSize: 12, color: '#5B5B5E', marginTop: 6, lineHeight: 17 },
  progressLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 10,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#E5E5EA',
    overflow: 'hidden',
    marginBottom: 16,
  },
  progressFill: { height: '100%', backgroundColor: '#8B5CF6', borderRadius: 3 },
  summaryBanner: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginBottom: 14,
  },
  summaryBannerText: { fontSize: 15, fontWeight: '700', color: '#1C1C1E' },
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
  completeFooterRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  footerButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  footerButtonText: { fontSize: 14, fontWeight: '700', color: '#333' },
  footerButtonPrimary: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#8B5CF6',
  },
  footerButtonPrimaryText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
});

export default ImportTrackModal;
