// src/components/LiveDeviceDetailModal.tsx
import React, { useState } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Calendar as CalendarIcon } from 'lucide-react-native';
import { DailyExposureEntry, ExposureReport } from '../types/exposure';
import { formatHkDateLabel } from '../utils/hkDate';
import ExposureDateScopedView from './ExposureDateScopedView';
import ExposureDatePickerModal, { DateSelection } from './ExposureDatePickerModal';

type Props = {
  visible: boolean;
  onClose: () => void;
  todayKey: string;
  todayReport: ExposureReport | null;
  todayLoading: boolean;
  history: DailyExposureEntry[];
};

// The live self-tracked device's full-screen detail page — same
// back-arrow/date-pill shape as DeviceDetailModal, but no Import/Trash
// actions, since this device only ever gets data via background tracking
// (see ExposureScreen's compact "This Device" card, which is this page's
// collapsed/"hidden" state).
const LiveDeviceDetailModal: React.FC<Props> = ({
  visible,
  onClose,
  todayKey,
  todayReport,
  todayLoading,
  history,
}) => {
  const insets = useSafeAreaInsets();
  const [selection, setSelection] = useState<DateSelection>({ mode: 'single', date: todayKey });
  const [pickerOpen, setPickerOpen] = useState(false);

  const selectionLabel =
    selection.mode === 'single'
      ? formatHkDateLabel(selection.date, todayKey)
      : `${formatHkDateLabel(selection.start, todayKey)} – ${formatHkDateLabel(selection.end, todayKey)}`;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity onPress={onClose} hitSlop={10}>
              <ArrowLeft size={22} color="#333" />
            </TouchableOpacity>
            <Text style={styles.headerTitle} numberOfLines={1}>
              This Device
            </Text>
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
            selection={selection}
            todayKey={todayKey}
            todayReport={todayReport}
            todayLoading={todayLoading}
            formatDateLabel={date => formatHkDateLabel(date, todayKey)}
            variant="full"
          />
        </ScrollView>
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
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 14, flexShrink: 1 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#1C1C1E', flexShrink: 1 },
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

export default LiveDeviceDetailModal;
