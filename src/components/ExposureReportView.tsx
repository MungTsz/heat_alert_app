// src/components/ExposureReportView.tsx
import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { AlertTriangle } from 'lucide-react-native';
import { ExposureReport } from '../types/exposure';
import { isExposureDataMocked } from '../data/exposure';
import { exposureColor } from '../utils/exposureColor';
import ExposureTrendChart from './ExposureTrendChart';
import ExposureTrajectoryMap from './ExposureTrajectoryMap';

type Props = {
  report: ExposureReport;
  title: string;
};

const formatDuration = (ms: number): string => {
  const totalMinutes = Math.round(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  return `${hours}h ${minutes}m`;
};

const formatTime = (ms: number): string =>
  new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const ExposureReportView: React.FC<Props> = ({ report, title }) => {
  const maxExposure = useMemo(
    () => Math.max(0, ...report.segments.map(s => s.exposure)),
    [report.segments],
  );

  return (
    <View>
      {isExposureDataMocked && (
        <View style={styles.mockBanner}>
          <AlertTriangle size={14} color="#9A6700" />
          <Text style={styles.mockBannerText}>
            Mock data — not yet connected to the live exposure API
          </Text>
        </View>
      )}

      <View style={styles.summaryCard}>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>
              {report.totalExposure.toFixed(2)}
            </Text>
            <Text style={styles.statLabel}>Total exposure (%AR·h)</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>
              {formatDuration(report.timeRangeEnd - report.timeRangeStart)}
            </Text>
            <Text style={styles.statLabel}>Duration</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{report.segments.length}</Text>
            <Text style={styles.statLabel}>Locations</Text>
          </View>
        </View>
        {report.segments.length > 0 && (
          <Text style={styles.rangeText}>
            {formatTime(report.timeRangeStart)} –{' '}
            {formatTime(report.timeRangeEnd)}
          </Text>
        )}
      </View>

      <ExposureTrajectoryMap segments={report.segments} />

      {report.segments.length > 0 && (
        <View style={styles.trendCard}>
          <ExposureTrendChart segments={report.segments} title="Hourly Exposure" />
        </View>
      )}

      {report.segments.length === 0 ? (
        <Text style={styles.emptyText}>
          No segments long enough to calculate exposure.
        </Text>
      ) : (
        <>
          <View style={styles.segmentListHeader}>
            <View style={styles.segmentDotSpacer} />
            <Text style={styles.segmentListHeaderText}>Time at location</Text>
            <Text style={[styles.segmentListHeaderText, styles.segmentListHeaderExposure]}>
              Exposure (%AR·h)
            </Text>
          </View>
          <ScrollView style={styles.segmentList} nestedScrollEnabled>
            {report.segments.map((segment, i) => (
            <View key={`${segment.startTime}-${i}`} style={styles.segmentRow}>
              <View
                style={[
                  styles.segmentDot,
                  { backgroundColor: exposureColor(segment.exposure, maxExposure) },
                ]}
              />
              <View style={styles.segmentInfo}>
                <Text style={styles.segmentTime}>
                  {formatTime(segment.startTime)} – {formatTime(segment.endTime)}{' '}
                  ({formatDuration(segment.endTime - segment.startTime)})
                </Text>
                <Text style={styles.segmentLocation}>
                  {segment.lat.toFixed(5)}, {segment.lon.toFixed(5)}
                </Text>
              </View>
              <Text style={styles.segmentExposure}>
                {segment.exposure.toFixed(3)}
              </Text>
            </View>
            ))}
          </ScrollView>
        </>
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
  mockBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFF3CD',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  mockBannerText: { fontSize: 12, color: '#9A6700', flexShrink: 1 },
  title: { fontSize: 16, fontWeight: '700', color: '#1C1C1E', marginBottom: 10 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  stat: { alignItems: 'center', flex: 1 },
  statValue: { fontSize: 20, fontWeight: '700', color: '#1C1C1E' },
  statLabel: { fontSize: 11, color: '#8E8E93', marginTop: 2 },
  rangeText: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 10,
    textAlign: 'center',
  },
  trendCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  emptyText: {
    color: '#8E8E93',
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 20,
  },
  segmentListHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  segmentDotSpacer: { width: 10, marginRight: 10 },
  segmentListHeaderText: { flex: 1, fontSize: 10, fontWeight: '700', color: '#8E8E93' },
  segmentListHeaderExposure: { flex: 0, textAlign: 'right' },
  segmentList: { maxHeight: 300 },
  segmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.08)',
  },
  segmentDot: { width: 10, height: 10, borderRadius: 5, marginRight: 10 },
  segmentInfo: { flex: 1 },
  segmentTime: { fontSize: 13, fontWeight: '600', color: '#1C1C1E' },
  segmentLocation: { fontSize: 11, color: '#8E8E93', marginTop: 2 },
  segmentExposure: { fontSize: 14, fontWeight: '700', color: '#1C1C1E' },
});

export default ExposureReportView;
