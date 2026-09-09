// src/components/ExposureCompactDayView.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ExposureReport } from '../types/exposure';
import ExposureTrajectoryMap from './ExposureTrajectoryMap';
import ExposureTrendChart from './ExposureTrendChart';

type Props = { report: ExposureReport };

// A single day's map + hourly chart with no summary stats card or
// per-location segment list — used by a device workspace's detail view,
// which is scoped to "browse by date" rather than the full drill-down
// ExposureReportView gives the live device's own screen.
const ExposureCompactDayView: React.FC<Props> = ({ report }) =>
  report.segments.length === 0 ? (
    <View style={styles.emptyCard}>
      <Text style={styles.emptyText}>No segments long enough to calculate exposure.</Text>
    </View>
  ) : (
    <View>
      <ExposureTrajectoryMap segments={report.segments} />
      <View style={styles.chartCard}>
        <ExposureTrendChart segments={report.segments} />
      </View>
    </View>
  );

const styles = StyleSheet.create({
  chartCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16 },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  emptyText: { color: '#8E8E93', fontSize: 13, textAlign: 'center' },
});

export default ExposureCompactDayView;
