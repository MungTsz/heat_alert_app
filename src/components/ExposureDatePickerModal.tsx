// src/components/ExposureDatePickerModal.tsx
import React, { useMemo } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { Calendar, DateData } from 'react-native-calendars';
import { toHkDateKey } from '../utils/hkDate';
import { WEEK_START_DAY } from '../config/exposureWeekChartConfig';

type Props = {
  visible: boolean;
  selectedDate: string | null;
  // Days that have tracked data — dotted on the calendar so a valid day is
  // easy to find without tapping around blind.
  trackedDates: string[];
  onClose: () => void;
  onSelect: (date: string) => void;
};

const ACCENT = '#8B5CF6';

// Single-day picker: the Exposure tab compares week by week, so picking a
// date just jumps the weekly chart to that day's week and drills into it.
// With only one tap to make there's nothing to confirm, so a tap applies and
// closes immediately (no Apply button).
const ExposureDatePickerModal: React.FC<Props> = ({
  visible,
  selectedDate,
  trackedDates,
  onClose,
  onSelect,
}) => {
  const insets = useSafeAreaInsets();
  const todayKey = toHkDateKey();

  const markedDates = useMemo(() => {
    const marks: Record<
      string,
      { marked?: boolean; dotColor?: string; selected?: boolean; selectedColor?: string }
    > = {};
    for (const date of trackedDates) marks[date] = { marked: true, dotColor: ACCENT };
    if (selectedDate) {
      marks[selectedDate] = { ...marks[selectedDate], selected: true, selectedColor: ACCENT };
    }
    return marks;
  }, [trackedDates, selectedDate]);

  const handleSelect = (date: string) => {
    onSelect(date);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Select date</Text>
            <TouchableOpacity onPress={onClose} hitSlop={10}>
              <X size={22} color="#333" />
            </TouchableOpacity>
          </View>
          <Text style={styles.hint}>Dotted days have tracked exposure.</Text>
          <Calendar
            current={selectedDate ?? todayKey}
            markedDates={markedDates}
            onDayPress={(day: DateData) => handleSelect(day.dateString)}
            maxDate={todayKey}
            firstDay={WEEK_START_DAY}
            theme={{
              selectedDayBackgroundColor: ACCENT,
              todayTextColor: ACCENT,
              arrowColor: ACCENT,
              dotColor: ACCENT,
            }}
          />
          <TouchableOpacity style={styles.todayButton} onPress={() => handleSelect(todayKey)}>
            <Text style={styles.todayButtonText}>Today</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#1C1C1E' },
  hint: { fontSize: 12, color: '#8E8E93', marginBottom: 8 },
  todayButton: {
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
    marginTop: 12,
  },
  todayButtonText: { fontSize: 14, fontWeight: '700', color: '#333' },
});

export default ExposureDatePickerModal;
