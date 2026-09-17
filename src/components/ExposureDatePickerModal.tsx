// src/components/ExposureDatePickerModal.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { Calendar, DateData } from 'react-native-calendars';
import { toHkDateKey, addHkDays, diffHkDays } from '../utils/hkDate';
import { MAX_CACHED_DAYS } from '../services/exposureHistoryService';

export type DateSelection =
  | { mode: 'single'; date: string }
  | { mode: 'range'; start: string; end: string };

type Props = {
  visible: boolean;
  initialSelection: DateSelection;
  onClose: () => void;
  onApply: (selection: DateSelection) => void;
};

const ACCENT = '#8B5CF6';
// Reuses the history cache's own retention window as the pickable range cap,
// so the two numbers can't drift apart and a maxed-out pick never outruns
// what's actually cached (a wider pick would just render empty placeholder
// days).
const MAX_RANGE_DAYS = MAX_CACHED_DAYS;

const RANGE_PRESETS: { label: string; days: number }[] = [
  { label: 'Last week', days: 7 },
  { label: 'Last 2 weeks', days: 14 },
  { label: 'Last month', days: 30 },
  { label: 'Last 90 days', days: 90 },
];

const ExposureDatePickerModal: React.FC<Props> = ({
  visible,
  initialSelection,
  onClose,
  onApply,
}) => {
  const insets = useSafeAreaInsets();
  const [start, setStart] = useState<string | null>(null);
  const [end, setEnd] = useState<string | null>(null);
  const todayKey = toHkDateKey();

  // Re-seed from the screen's current selection each time the sheet opens,
  // rather than carrying over whatever was mid-pick last time it was closed.
  useEffect(() => {
    if (!visible) return;
    if (initialSelection.mode === 'single') {
      setStart(initialSelection.date);
      setEnd(null);
    } else {
      setStart(initialSelection.start);
      setEnd(initialSelection.end);
    }
  }, [visible, initialSelection]);

  const handleDayPress = (day: DateData) => {
    const date = day.dateString;
    if (!start || end) {
      // Starting a fresh pick (nothing selected yet, or a range was already
      // complete) — this tap becomes the new single-date start.
      setStart(date);
      setEnd(null);
      return;
    }
    if (date === start) return; // tapping the same day again keeps it a single date
    // Whichever date was just tapped always lands exactly where tapped; if
    // the resulting span would exceed the cap, the OTHER (previously-set)
    // boundary gets pulled inward toward it instead of rejecting the tap.
    if (date < start) {
      const spanDays = diffHkDays(date, start) + 1;
      setEnd(spanDays > MAX_RANGE_DAYS ? addHkDays(date, MAX_RANGE_DAYS - 1) : start);
      setStart(date);
    } else {
      const spanDays = diffHkDays(start, date) + 1;
      if (spanDays > MAX_RANGE_DAYS) setStart(addHkDays(date, -(MAX_RANGE_DAYS - 1)));
      setEnd(date);
    }
  };

  const handlePreset = (days: number) => {
    setStart(addHkDays(todayKey, -(days - 1)));
    setEnd(todayKey);
  };

  const markedDates = useMemo(() => {
    if (!start) return {};
    if (!end) {
      return { [start]: { selected: true, selectedColor: ACCENT } };
    }
    const marks: Record<
      string,
      { color: string; textColor: string; startingDay?: boolean; endingDay?: boolean }
    > = {};
    let cursor = start;
    while (cursor <= end) {
      marks[cursor] = {
        color: ACCENT,
        textColor: '#FFFFFF',
        startingDay: cursor === start,
        endingDay: cursor === end,
      };
      cursor = addHkDays(cursor, 1);
    }
    return marks;
  }, [start, end]);

  const handleApply = () => {
    if (!start) return;
    if (end && end !== start) {
      onApply({ mode: 'range', start, end });
    } else {
      onApply({ mode: 'single', date: start });
    }
    onClose();
  };

  const handleToday = () => {
    setStart(todayKey);
    setEnd(null);
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
          <Text style={styles.hint}>
            Tap a day for a single date, or tap a second day to select a range
            (max {MAX_RANGE_DAYS} days).
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.presetRow}
            contentContainerStyle={styles.presetRowContent}
          >
            {RANGE_PRESETS.map(preset => (
              <TouchableOpacity
                key={preset.label}
                style={styles.presetChip}
                onPress={() => handlePreset(preset.days)}
              >
                <Text style={styles.presetChipText}>{preset.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <Calendar
            markingType="period"
            markedDates={markedDates}
            onDayPress={handleDayPress}
            maxDate={todayKey}
            theme={{
              selectedDayBackgroundColor: ACCENT,
              todayTextColor: ACCENT,
              arrowColor: ACCENT,
              dotColor: ACCENT,
            }}
          />
          <View style={styles.footerRow}>
            <TouchableOpacity style={styles.footerButton} onPress={handleToday}>
              <Text style={styles.footerButtonText}>Today</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.footerButton,
                styles.applyButton,
                !start && styles.applyButtonDisabled,
              ]}
              onPress={handleApply}
              disabled={!start}
            >
              <Text style={[styles.footerButtonText, styles.applyButtonText]}>Apply</Text>
            </TouchableOpacity>
          </View>
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
  presetRow: { marginBottom: 12 },
  presetRowContent: { gap: 8 },
  presetChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: '#F0EBFF',
  },
  presetChipText: { fontSize: 12, fontWeight: '700', color: ACCENT },
  footerRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  footerButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
  },
  footerButtonText: { fontSize: 14, fontWeight: '700', color: '#333' },
  applyButton: { backgroundColor: ACCENT },
  applyButtonDisabled: { opacity: 0.5 },
  applyButtonText: { color: '#FFFFFF' },
});

export default ExposureDatePickerModal;
