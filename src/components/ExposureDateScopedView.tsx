// src/components/ExposureDateScopedView.tsx
import React, { useCallback, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { DailyExposureEntry, ExposureReport } from '../types/exposure';
import { listHkDays } from '../utils/hkDate';
import ExposureReportView from './ExposureReportView';
import ExposureCompactDayView from './ExposureCompactDayView';
import ExposureWeekCard from './ExposureWeekCard';
import ExposureHourlyPager, { HourlyPageContent } from './ExposureHourlyPager';

type Props = {
  history: DailyExposureEntry[];
  // The visible week and the drilled-into day (null = none) — see
  // useExposureWeekSelection for how these move together.
  weekStart: string;
  selectedDate: string | null;
  onSelectDay: (date: string) => void;
  onWeekChange: (weekStart: string) => void;
  // A swipe / ‹ › on the hourly pager — selects that day and moves the week
  // card to its week (useExposureWeekSelection's pickDate).
  onPickDate: (date: string) => void;
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
  onPickDate,
  todayKey,
  todayReport,
  todayLoading = false,
  formatDateLabel,
  variant = 'full',
  importingHint,
}) => {
  const reportsByDate = useMemo(
    () => new Map(history.map(entry => [entry.date, entry.report])),
    [history],
  );
  // The live poll's report beats the persisted copy, which can lag a tick.
  const reportFor = useCallback(
    (date: string): ExposureReport | undefined =>
      (date === todayKey && todayReport) || reportsByDate.get(date),
    [todayKey, todayReport, reportsByDate],
  );

  // Oldest tracked day (or the selected one, if a calendar pick landed
  // earlier) through today — every day in between gets a page, so a swipe is
  // always exactly one day, mirroring the week card's paging.
  const pagerDates = useMemo(() => {
    const anchor = selectedDate ?? todayKey;
    const earliest = history.reduce(
      (min, entry) => (entry.date < min ? entry.date : min),
      anchor < todayKey ? anchor : todayKey,
    );
    return listHkDays(earliest, anchor > todayKey ? anchor : todayKey);
  }, [history, selectedDate, todayKey]);

  const getHourlyPage = useCallback(
    (date: string): HourlyPageContent => {
      const report = reportFor(date);
      if (report) return report.segments;
      if (date === todayKey && todayLoading) return "Calculating today's exposure…";
      return importingHint ?? 'No tracked exposure for this day yet.';
    },
    [reportFor, todayKey, todayLoading, importingHint],
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

    const hourlyPager = (
      <ExposureHourlyPager
        dates={pagerDates}
        selectedDate={selectedDate}
        todayKey={todayKey}
        getPage={getHourlyPage}
        onDateChange={onPickDate}
      />
    );

    const report = reportFor(selectedDate);
    // A day with nothing to map still shows the pager on its own (its page
    // carries the "no data" / "calculating" message), so the user can keep
    // swiping instead of hitting a dead end on an untracked day.
    if (!report || report.segments.length === 0) {
      return <View style={styles.pagerCard}>{hourlyPager}</View>;
    }

    const title =
      selectedDate === todayKey && todayReport ? "Today's Exposure" : formatDateLabel(selectedDate);
    return variant === 'compact' ? (
      <ExposureCompactDayView report={report} hourlyChart={hourlyPager} />
    ) : (
      <ExposureReportView report={report} title={title} hourlyChart={hourlyPager} />
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
  pagerCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 12 },
});

export default ExposureDateScopedView;
