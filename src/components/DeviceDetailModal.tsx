// src/components/DeviceDetailModal.tsx
import React, { useState } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Trash2, Upload, Calendar as CalendarIcon } from 'lucide-react-native';
import { ExposureDevice } from '../types/exposure';
import { useExposureHistory } from '../hooks/useExposureHistory';
import { toHkDateKey, formatHkDateLabel } from '../utils/hkDate';
import { getLastTrackedDate } from '../utils/exposureLastTrackedDate';
import ExposureDateScopedView from './ExposureDateScopedView';
import ExposureDatePickerModal, { DateSelection } from './ExposureDatePickerModal';
import ImportTrackModal from './ImportTrackModal';

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
  const { history } = useExposureHistory(device?.id ?? '__no_device_selected__');
  const todayKey = toHkDateKey();
  // null = nothing explicitly picked yet — the screen defaults to the last
  // tracked day (below) rather than forcing "today", but the date PICKER
  // itself should still open blank in that case (see ExposureDatePickerModal
  // and LiveDeviceDetailModal for the same pattern), not pre-anchored to
  // this computed default.
  const [selection, setSelection] = useState<DateSelection | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  if (!device) return null;

  // A device workspace has no live "today" report of its own (todayHasData
  // is always false) — its default falls through to the newest history
  // entry, or todayKey if nothing's been imported yet at all.
  const effectiveSelection: DateSelection =
    selection ?? { mode: 'single', date: getLastTrackedDate(history, todayKey, false) };

  const selectionLabel =
    effectiveSelection.mode === 'single'
      ? formatHkDateLabel(effectiveSelection.date, todayKey)
      : `${formatHkDateLabel(effectiveSelection.start, todayKey)} – ${formatHkDateLabel(effectiveSelection.end, todayKey)}`;

  const handleDelete = () => {
    onDelete(device.id);
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
        >
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionLabel}>DAILY EXPOSURE</Text>
            <TouchableOpacity style={styles.datePill} onPress={() => setPickerOpen(true)}>
              <CalendarIcon size={14} color="#8B5CF6" />
              <Text style={styles.datePillText}>{selectionLabel}</Text>
            </TouchableOpacity>
          </View>

          <ExposureDateScopedView
            history={history}
            selection={effectiveSelection}
            todayKey={todayKey}
            todayReport={null}
            formatDateLabel={date => formatHkDateLabel(date, todayKey)}
            variant="compact"
          />
        </ScrollView>
      </View>

      <ExposureDatePickerModal
        visible={pickerOpen}
        initialSelection={selection}
        onClose={() => setPickerOpen(false)}
        onApply={setSelection}
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
});

export default DeviceDetailModal;
