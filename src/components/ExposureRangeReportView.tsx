// src/components/ExposureRangeReportView.tsx
import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { DailyExposureEntry, ExposureReport } from '../types/exposure';
import ExposureTrajectoryMap from './ExposureTrajectoryMap';
import ExposureDailyBarChart from './ExposureDailyBarChart';

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

// A selected calendar range shows one merged map (every day's points loaded
// together) and one chart (daily totals) — deliberately no per-segment list,
// which would get unwieldy across many days; that level of detail is what
// picking a single date is for.
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

  const mergedSegments = useMemo(
    () =>
      daysInRange
        .flatMap(entry => entry.report.segments)
        .sort((a, b) => a.startTime - b.startTime),
    [daysInRange],
  );

  const totalExposure = daysInRange.reduce((sum, e) => sum + e.report.totalExposure, 0);

  return (
    <View>
      <View style={styles.summaryCard}>
        <Text style={styles.title}>
          {rangeStart}
          {rangeStart !== rangeEnd ? ` – ${rangeEnd}` : ''}
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

      {mergedSegments.length > 0 ? (
        <ExposureTrajectoryMap segments={mergedSegments} />
      ) : (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No tracked exposure in this range yet.</Text>
        </View>
      )}

      <View style={styles.chartCard}>
        <ExposureDailyBarChart
          history={daysInRange}
          rangeStart={rangeStart}
          rangeEnd={rangeEnd}
          todayOverride={
            todayReport && todayKey >= rangeStart && todayKey <= rangeEnd
              ? { date: todayKey, total: todayReport.totalExposure }
              : undefined
          }
        />
      </View>
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
  },
});

export default ExposureRangeReportView;
