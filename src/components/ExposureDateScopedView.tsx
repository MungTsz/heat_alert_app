// src/components/ExposureDateScopedView.tsx
import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { DailyExposureEntry, ExposureReport } from '../types/exposure';
import { DateSelection } from './ExposureDatePickerModal';
import ExposureReportView from './ExposureReportView';
import ExposureCompactDayView from './ExposureCompactDayView';
import ExposureRangeReportView from './ExposureRangeReportView';

type Props = {
  history: DailyExposureEntry[];
  selection: DateSelection;
  todayKey: string;
  // Only the live self-tracked device has a "today" report still being
  // polled — pass null/false for a device workspace, which has no live
  // tracking of its own, so today just falls through to the history lookup
  // below like any other date.
  todayReport: ExposureReport | null;
  todayLoading?: boolean;
  formatDateLabel: (dateKey: string) => string;
  // 'full' (default): the live device's own screen — stats card, map,
  // chart, and the per-location segment list. 'compact': a device
  // workspace's detail view — map + chart only, no stats card/segment list.
  variant?: 'full' | 'compact';
};

// The single/range/loading/empty branching shared by the main Exposure
// screen (live device) and a device workspace's detail view — extracted so
// both stay in sync rather than duplicating this ternary.
const ExposureDateScopedView: React.FC<Props> = ({
  history,
  selection,
  todayKey,
  todayReport,
  todayLoading = false,
  formatDateLabel,
  variant = 'full',
}) => {
  const renderDay = (report: ExposureReport, title: string) =>
    variant === 'compact' ? (
      <ExposureCompactDayView report={report} />
    ) : (
      <ExposureReportView report={report} title={title} />
    );

  if (selection.mode === 'range') {
    return (
      <ExposureRangeReportView
        history={history}
        rangeStart={selection.start}
        rangeEnd={selection.end}
        todayKey={todayKey}
        todayReport={todayReport}
      />
    );
  }

  if (selection.date === todayKey && todayReport) {
    return renderDay(todayReport, "Today's Exposure");
  }

  if (selection.date === todayKey && todayLoading) {
    return (
      <View style={styles.loadingBox}>
        <ActivityIndicator style={styles.loadingIndicator} />
        <Text style={styles.loadingText}>Calculating today's exposure…</Text>
      </View>
    );
  }

  const entry = history.find(h => h.date === selection.date);
  return entry ? (
    renderDay(entry.report, formatDateLabel(selection.date))
  ) : (
    <View style={styles.emptyCard}>
      <Text style={styles.emptyText}>No tracked exposure for this day yet.</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
  },
  emptyText: { fontSize: 13, color: '#8E8E93', textAlign: 'center' },
  loadingBox: { alignItems: 'center', marginVertical: 30 },
  loadingIndicator: { marginBottom: 10 },
  loadingText: { fontSize: 13, color: '#8E8E93' },
});

export default ExposureDateScopedView;
