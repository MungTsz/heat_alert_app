// src/components/DeviceDetailModal.tsx
import React, { useState } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Trash2, Calendar as CalendarIcon } from 'lucide-react-native';
import { ExposureDevice } from '../types/exposure';
import { useExposureHistory } from '../hooks/useExposureHistory';
import { toHkDateKey } from '../utils/hkDate';
import ExposureDateScopedView from './ExposureDateScopedView';
import ExposureDatePickerModal, { DateSelection } from './ExposureDatePickerModal';

type Props = {
  visible: boolean;
  device: ExposureDevice | null;
  onClose: () => void;
  onDelete: (id: string) => void;
};

const formatDateLabel = (dateKey: string, todayKey: string): string => {
  if (dateKey === todayKey) return 'Today';
  return new Date(`${dateKey}T00:00:00`).toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
  });
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
  const [selection, setSelection] = useState<DateSelection>({ mode: 'single', date: todayKey });
  const [pickerOpen, setPickerOpen] = useState(false);

  if (!device) return null;

  const selectionLabel =
    selection.mode === 'single'
      ? formatDateLabel(selection.date, todayKey)
      : `${formatDateLabel(selection.start, todayKey)} – ${formatDateLabel(selection.end, todayKey)}`;

  const handleDelete = () => {
    onDelete(device.id);
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {device.name}
          </Text>
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={handleDelete} hitSlop={10}>
              <Trash2 size={20} color="#333" />
            </TouchableOpacity>
            <TouchableOpacity onPress={onClose} hitSlop={10}>
              <X size={22} color="#333" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.content}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionLabel}>DAILY EXPOSURE</Text>
            <TouchableOpacity style={styles.datePill} onPress={() => setPickerOpen(true)}>
              <CalendarIcon size={14} color="#8B5CF6" />
              <Text style={styles.datePillText}>{selectionLabel}</Text>
            </TouchableOpacity>
          </View>

          <ExposureDateScopedView
            history={history}
            selection={selection}
            todayKey={todayKey}
            todayReport={null}
            formatDateLabel={date => formatDateLabel(date, todayKey)}
            variant="compact"
          />
        </View>
      </View>

      <ExposureDatePickerModal
        visible={pickerOpen}
        initialSelection={selection}
        onClose={() => setPickerOpen(false)}
        onApply={setSelection}
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
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#1C1C1E', flexShrink: 1 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  content: { flex: 1, padding: 20 },
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
