// src/components/DeviceDetailModal.tsx
import React, { useMemo, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Trash2, Upload, Calendar as CalendarIcon } from 'lucide-react-native';
import { ExposureDevice } from '../types/exposure';
import { useExposureHistory } from '../hooks/useExposureHistory';
import { toHkDateKey, formatHkDateLabel } from '../utils/hkDate';
import { formatHkWeekRangeLabel } from '../utils/exposureWeekStats';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import { useImportJobStatus } from '../hooks/useImportJobStatus';
import { useExposureWeekSelection } from '../hooks/useExposureWeekSelection';
import ExposureDateScopedView from './ExposureDateScopedView';
import ExposureDatePickerModal from './ExposureDatePickerModal';
import ImportTrackModal from './ImportTrackModal';

// Same red as the Community tab's + button — the app's destructive accent.
const DELETE_DAY_COLOR = '#D9534F';

type Props = {
  visible: boolean;
  device: ExposureDevice | null;
  onClose: () => void;
  onDelete: (id: string) => void;
};

// A named device workspace's browsable view — same date-picker + map/chart
// pattern as the main Exposure screen, scoped to this device's own imported
// history (useExposureHistory(device.id)), but map + chart only (no
// summary-stats card or per-location segment list — see
// ExposureDateScopedView's 'compact' variant) and no import/tracking UI,
// since a device workspace only ever gets data via import.
const DeviceDetailModal: React.FC<Props> = ({ visible, device, onClose, onDelete }) => {
  const insets = useSafeAreaInsets();
  // No device selected (modal closed) still mounts this component (only
  // `visible` toggles) — fall back to a placeholder id rather than
  // useExposureHistory's own default, which would otherwise read the live
  // device's own history for no reason.
  const { history, loading, refresh, deleteDay } = useExposureHistory(
    device?.id ?? '__no_device_selected__',
  );
  const { status: jobStatus } = useImportJobStatus(device?.id ?? '__no_device_selected__', refresh);
  const { refreshing, onRefresh } = usePullToRefresh(refresh);
  const todayKey = toHkDateKey();
  // A device workspace has no live "today" report of its own (todayHasData
  // is always false) — its default falls through to the newest history
  // entry, or todayKey if nothing's been imported yet at all. Same
  // swipe/tap/calendar rules as LiveDeviceDetailModal via the shared hook.
  const { weekStart, selectedDate, toggleDay, changeWeek, pickDate } =
    useExposureWeekSelection(history, todayKey, false);
  const trackedDates = useMemo(() => history.map(entry => entry.date), [history]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [deletingDay, setDeletingDay] = useState(false);

  if (!device) return null;

  const selectionLabel = selectedDate
    ? formatHkDateLabel(selectedDate, todayKey)
    : formatHkWeekRangeLabel(weekStart);

  const importingHint = jobStatus
    ? 'Still processing your import — this can take a few minutes.'
    : undefined;

  // Only a single selected day that actually has data can be deleted — a
  // whole-week selection is too coarse a target for an undo-less action.
  const deletableDay =
    selectedDate && history.some(entry => entry.date === selectedDate) ? selectedDate : null;

  // Places saved to Community from this device's stays live in their own
  // store (bookmarkStorage.ts) and are never touched here — said explicitly
  // because the user may have built them from this very device's map.
  const handleDelete = () => {
    Alert.alert(
      'Delete Device',
      `Delete "${device.name}" and all of its imported history? This can't be undone.\n\nPlaces you saved to Community are kept.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => onDelete(device.id) },
      ],
    );
  };

  const runDeleteDay = async (dateKey: string, reimport: boolean) => {
    setDeletingDay(true);
    try {
      await deleteDay(dateKey);
      if (reimport) setImportOpen(true);
    } catch (error) {
      Alert.alert(
        "Couldn't delete this day",
        error instanceof Error ? error.message : 'Please try again.',
      );
    } finally {
      setDeletingDay(false);
    }
  };

  const handleDeleteDay = (dateKey: string) => {
    const label = formatHkDateLabel(dateKey, todayKey);
    Alert.alert(
      `Delete ${label}?`,
      `Removes ${label}'s exposure data from "${device.name}". Other days and your saved places are kept. You can import a file for this day again afterwards.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => runDeleteDay(dateKey, false) },
        { text: 'Delete & re-import', onPress: () => runDeleteDay(dateKey, true) },
      ],
    );
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity onPress={onClose} hitSlop={10}>
              <ArrowLeft size={22} color="#333" />
            </TouchableOpacity>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {device.name}
            </Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={() => setImportOpen(true)} hitSlop={10}>
              <Upload size={20} color="#333" />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleDelete} hitSlop={10}>
              <Trash2 size={20} color="#333" />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#8B5CF6" colors={['#8B5CF6']} />
          }
        >
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionLabel}>DAILY EXPOSURE</Text>
            <View style={styles.headerRightGroup}>
              {jobStatus ? (
                <View style={styles.updatingPill}>
                  <ActivityIndicator size="small" color="#8B5CF6" />
                  <Text style={styles.updatingPillText}>
                    Processing {jobStatus.completed}/{jobStatus.total}…
                  </Text>
                </View>
              ) : (
                loading && (
                  <View style={styles.updatingPill}>
                    <ActivityIndicator size="small" color="#8B5CF6" />
                    <Text style={styles.updatingPillText}>Updating…</Text>
                  </View>
                )
              )}
              <TouchableOpacity style={styles.datePill} onPress={() => setPickerOpen(true)}>
                <CalendarIcon size={14} color="#8B5CF6" />
                <Text style={styles.datePillText}>{selectionLabel}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <ExposureDateScopedView
            history={history}
            weekStart={weekStart}
            selectedDate={selectedDate}
            onSelectDay={toggleDay}
            onWeekChange={changeWeek}
            onPickDate={pickDate}
            todayKey={todayKey}
            todayReport={null}
            formatDateLabel={date => formatHkDateLabel(date, todayKey)}
            variant="compact"
            importingHint={importingHint}
          />

          {deletableDay && (
            <TouchableOpacity
              style={[styles.deleteDayButton, (deletingDay || !!jobStatus) && styles.deleteDayDisabled]}
              onPress={() => handleDeleteDay(deletableDay)}
              // A day can't be deleted mid-import: the backend would refuse
              // (409) since the import's rows would land after the delete.
              disabled={deletingDay || !!jobStatus}
            >
              {deletingDay ? (
                <ActivityIndicator size="small" color={DELETE_DAY_COLOR} />
              ) : (
                <Trash2 size={16} color={DELETE_DAY_COLOR} />
              )}
              <Text style={styles.deleteDayText}>
                Delete {formatHkDateLabel(deletableDay, todayKey)}'s data
              </Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>

      <ExposureDatePickerModal
        visible={pickerOpen}
        selectedDate={selectedDate}
        trackedDates={trackedDates}
        onClose={() => setPickerOpen(false)}
        onSelect={pickDate}
      />
      <ImportTrackModal
        visible={importOpen}
        onClose={() => setImportOpen(false)}
        lockedDeviceId={device.id}
      />
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
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 14, flexShrink: 1 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#1C1C1E', flexShrink: 1 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  content: { flex: 1 },
  contentContainer: { padding: 20, paddingBottom: 60 },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8E8E93',
    letterSpacing: 0.5,
  },
  headerRightGroup: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  updatingPill: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  updatingPillText: { fontSize: 12, color: '#8B5CF6', fontWeight: '600' },
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
  deleteDayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: DELETE_DAY_COLOR,
    backgroundColor: '#FFFFFF',
  },
  deleteDayDisabled: { opacity: 0.5 },
  deleteDayText: { fontSize: 14, fontWeight: '600', color: DELETE_DAY_COLOR },
});

export default DeviceDetailModal;
