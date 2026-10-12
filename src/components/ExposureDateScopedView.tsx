// src/components/ExposureDateScopedView.tsx
import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { DailyExposureEntry, ExposureReport } from '../types/exposure';
import ExposureReportView from './ExposureReportView';
import ExposureCompactDayView from './ExposureCompactDayView';
import ExposureWeekCard from './ExposureWeekCard';

type Props = {
  history: DailyExposureEntry[];
  // The visible week and the drilled-into day (null = none) — see
  // useExposureWeekSelection for how these move together.
  weekStart: string;
  selectedDate: string | null;
  onSelectDay: (date: string) => void;
  onWeekChange: (weekStart: string) => void;
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
  // Overrides the "no data yet" empty state below — used by a device
  // workspace to explain that an import is still processing in the
  // background rather than reading as a failed/empty import.
  importingHint?: string;
};

// The weekly chart + selected-day branching shared by the main Exposure
// screen (live device) and a device workspace's detail view — extracted so
// both stay in sync rather than duplicating this ternary.
const ExposureDateScopedView: React.FC<Props> = ({
  history,
  weekStart,
  selectedDate,
  onSelectDay,
  onWeekChange,
  todayKey,
  todayReport,
  todayLoading = false,
  formatDateLabel,
  variant = 'full',
  importingHint,
}) => {
  const renderDay = (report: ExposureReport, title: string) =>
    variant === 'compact' ? (
      <ExposureCompactDayView report={report} />
    ) : (
      <ExposureReportView report={report} title={title} />
    );

  const renderDetail = () => {
    // No day drilled into (after a swipe) — the map/hourly detail only
    // appears for a day the user explicitly tapped, instead of re-rendering
    // a whole map on every swipe.
    if (selectedDate === null) {
      return (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>
            Tap a day in the chart to see its map and hourly breakdown.
          </Text>
        </View>
      );
    }

    if (selectedDate === todayKey && todayReport) {
      return renderDay(todayReport, "Today's Exposure");
    }

    if (selectedDate === todayKey && todayLoading) {
      return (
        <View style={styles.loadingBox}>
          <ActivityIndicator style={styles.loadingIndicator} />
          <Text style={styles.loadingText}>Calculating today's exposure…</Text>
        </View>
      );
    }

    const entry = history.find(h => h.date === selectedDate);
    return entry ? (
      renderDay(entry.report, formatDateLabel(selectedDate))
    ) : (
      <View style={styles.emptyCard}>
        <Text style={styles.emptyText}>
          {importingHint ?? 'No tracked exposure for this day yet.'}
        </Text>
      </View>
    );
  };

  return (
    <View>
      <ExposureWeekCard
        history={history}
        todayKey={todayKey}
        todayReport={todayReport}
        weekStart={weekStart}
        selectedDate={selectedDate}
        onSelectDay={onSelectDay}
        onWeekChange={onWeekChange}
      />
      {renderDetail()}
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
