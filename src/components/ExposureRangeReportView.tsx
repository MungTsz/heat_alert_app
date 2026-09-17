// src/components/ExposureRangeReportView.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { DailyExposureEntry, ExposureReport } from '../types/exposure';
import { formatHkDateLabel } from '../utils/hkDate';
import { sumExposureByIo } from '../utils/exposureIoTotals';
import ExposureTrajectoryMap from './ExposureTrajectoryMap';
import ExposureDailyBarChart from './ExposureDailyBarChart';
import ExposureTrendChart from './ExposureTrendChart';

type Props = {
  history: DailyExposureEntry[];
  rangeStart: string; // YYYY-MM-DD, HK local, inclusive
  rangeEnd: string; // YYYY-MM-DD, HK local, inclusive
  // Today's entry comes from the live report, not the (possibly one tick
  // stale) persisted history — same reasoning as ExposureScreen's single-day
  // view.
  todayKey: string;
  todayReport: ExposureReport | null;
};

// A selected calendar range shows one day at a time (defaulting to the last
// day) on the map and in the hourly chart, plus one range-wide daily-totals
// chart to switch between days — deliberately no per-segment list, which
// would get unwieldy across many days; that level of detail is what picking
// a single date is for.
const ExposureRangeReportView: React.FC<Props> = ({
  history,
  rangeStart,
  rangeEnd,
  todayKey,
  todayReport,
}) => {
  const daysInRange = useMemo(() => {
    const byDate = new Map(history.map(entry => [entry.date, entry]));
    if (todayReport && todayKey >= rangeStart && todayKey <= rangeEnd) {
      byDate.set(todayKey, { date: todayKey, report: todayReport, updatedAt: Date.now() });
    }
    return Array.from(byDate.values())
      .filter(entry => entry.date >= rangeStart && entry.date <= rangeEnd)
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [history, rangeStart, rangeEnd, todayKey, todayReport]);

  // The map and hourly chart below always show one day at a time — default
  // to the last day that actually has tracked data (not necessarily
  // rangeEnd itself, which may be an empty/future day), and only re-default
  // when the user picks a new range — not on every live poll update, which
  // would otherwise keep yanking the selection back while today's report
  // refreshes in the background.
  const [selectedDate, setSelectedDate] = useState(rangeEnd);
  const lastRangeRef = useRef<string | null>(null);
  useEffect(() => {
    const rangeId = `${rangeStart}:${rangeEnd}`;
    if (lastRangeRef.current === rangeId) return;
    lastRangeRef.current = rangeId;
    setSelectedDate(daysInRange.length > 0 ? daysInRange[daysInRange.length - 1].date : rangeEnd);
  }, [rangeStart, rangeEnd, daysInRange]);

  const mergedSegments = useMemo(
    () =>
      daysInRange
        .flatMap(entry => entry.report.segments)
        .sort((a, b) => a.startTime - b.startTime),
    [daysInRange],
  );

  const selectedDaySegments = useMemo(
    () => daysInRange.find(entry => entry.date === selectedDate)?.report.segments ?? [],
    [daysInRange, selectedDate],
  );

  const totalExposure = daysInRange.reduce((sum, e) => sum + e.report.totalExposure, 0);

  return (
    <View>
      <View style={styles.summaryCard}>
        <Text style={styles.title}>
          {formatHkDateLabel(rangeStart, todayKey)}
          {rangeStart !== rangeEnd ? ` – ${formatHkDateLabel(rangeEnd, todayKey)}` : ''}
        </Text>
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{totalExposure.toFixed(2)}</Text>
            <Text style={styles.statLabel}>Total exposure (%AR·h)</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{daysInRange.length}</Text>
            <Text style={styles.statLabel}>Tracked days</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{mergedSegments.length}</Text>
            <Text style={styles.statLabel}>Locations</Text>
          </View>
        </View>
      </View>

      {selectedDaySegments.length > 0 ? (
        <ExposureTrajectoryMap segments={selectedDaySegments} />
      ) : (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>
            No tracked exposure on {formatHkDateLabel(selectedDate, todayKey)} yet.
          </Text>
        </View>
      )}

      <View style={styles.chartCard}>
        <ExposureDailyBarChart
          history={daysInRange}
          rangeStart={rangeStart}
          rangeEnd={rangeEnd}
          selectedDate={selectedDate}
          onSelectDay={setSelectedDate}
          todayKey={todayKey}
          todayOverride={
            todayReport && todayKey >= rangeStart && todayKey <= rangeEnd
              ? (() => {
                  const { indoor, outdoor } = sumExposureByIo(todayReport.segments);
                  return { date: todayKey, indoor, outdoor };
                })()
              : undefined
          }
        />
      </View>

      {selectedDaySegments.length > 0 && (
        <View style={styles.chartCard}>
          <View style={styles.hourlyHeaderRow}>
            <Text style={styles.hourlyTitle}>Hourly Exposure</Text>
            <Text style={styles.hourlySubtitle}>{formatHkDateLabel(selectedDate, todayKey)}</Text>
          </View>
          <ExposureTrendChart segments={selectedDaySegments} />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
  },
  title: { fontSize: 16, fontWeight: '700', color: '#1C1C1E', marginBottom: 10 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  stat: { alignItems: 'center', flex: 1 },
  statValue: { fontSize: 20, fontWeight: '700', color: '#1C1C1E' },
  statLabel: { fontSize: 11, color: '#8E8E93', marginTop: 2, textAlign: 'center' },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 12,
  },
  emptyText: { color: '#8E8E93', fontSize: 13, textAlign: 'center' },
  chartCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  hourlyHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  hourlyTitle: { fontSize: 15, fontWeight: '700', color: '#1C1C1E' },
  hourlySubtitle: { fontSize: 12, fontWeight: '600', color: '#8E8E93' },
});

export default ExposureRangeReportView;
