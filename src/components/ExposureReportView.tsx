// src/components/ExposureReportView.tsx
import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { AlertTriangle } from 'lucide-react-native';
import { ExposureReport } from '../types/exposure';
import { isExposureDataMocked } from '../data/exposure';
import { EXPOSURE_MAP_CONFIG } from '../config/exposureMapConfig';
import { EXPOSURE_IO_CONFIG } from '../config/exposureIoConfig';
import { EXPOSURE_IO_ICONS } from '../config/exposureIoIconConfig';
import { clusterStayPoints } from '../utils/geoClustering';
import {
  buildExposureTimeline,
  buildTripLegs,
  ExposureTimelineItem,
} from '../utils/exposureTrajectory';
import { formatDuration, formatRoadList, formatTime } from '../utils/exposureFormat';
import ExposureTrendChart from './ExposureTrendChart';
import ExposureTrajectoryMap from './ExposureTrajectoryMap';

type Props = {
  report: ExposureReport;
  title: string;
  // Replaces the single-day hourly chart (e.g. with the swipeable day
  // pager), keeping it in the same spot between the map and segment list.
  hourlyChart?: React.ReactNode;
};

// One timeline row's display fields — stays and trips share the row layout.
const timelineRowContent = (item: ExposureTimelineItem) => {
  if (item.type === 'stay') {
    const { stay } = item;
    return {
      io: stay.io,
      inHk: stay.inHk,
      startTime: stay.startTime,
      endTime: stay.endTime,
      durationMs: stay.totalDurationMs,
      exposure: stay.totalExposure,
      detail: null,
    };
  }
  const { leg } = item;
  return {
    io: leg.io,
    inHk: leg.inHk,
    startTime: leg.startTime,
    endTime: leg.endTime,
    durationMs: leg.totalDurationMs,
    exposure: leg.totalExposure,
    // Roads for a vehicle ride; "underground" explains a dashed MTR line.
    detail:
      formatRoadList(leg.roadNames, EXPOSURE_MAP_CONFIG.maxRoadNamesShown) ??
      (leg.pathInferred ? 'underground' : null),
  };
};

const ExposureReportView: React.FC<Props> = ({ report, title, hourlyChart }) => {
  // The same stays/legs the map draws (same functions, same radius), so a
  // timeline row and a dot/line on the map are always the same thing — the
  // raw rows would list every thinned route point (hundreds a day).
  const timeline = useMemo(
    () =>
      buildExposureTimeline(
        clusterStayPoints(report.segments, EXPOSURE_MAP_CONFIG.stayRadiusMeters),
        buildTripLegs(report.segments),
      ),
    [report.segments],
  );
  // The exposure-relevant headline the io split makes possible: open-air
  // time, where heat and air quality hit hardest.
  const outdoorMs = useMemo(
    () =>
      report.segments
        .filter(s => s.io === 'Outdoor')
        .reduce((sum, s) => sum + (s.endTime - s.startTime), 0),
    [report.segments],
  );

  return (
    <View>
      {isExposureDataMocked && (
        <View style={styles.mockBanner}>
          <AlertTriangle size={14} color="#9A6700" />
          <Text style={styles.mockBannerText}>
            Mock data — not yet connected to the exposure ETL backend
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
            <Text style={styles.statValue}>{formatDuration(outdoorMs)}</Text>
            <Text style={styles.statLabel}>Time outdoors</Text>
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

      {hourlyChart ? (
        <View style={styles.trendCard}>{hourlyChart}</View>
      ) : (
        report.segments.length > 0 && (
          <View style={styles.trendCard}>
            <ExposureTrendChart segments={report.segments} title="Hourly Exposure" />
          </View>
        )
      )}

      {report.segments.length === 0 ? (
        <Text style={styles.emptyText}>
          No segments long enough to calculate exposure.
        </Text>
      ) : (
        <>
          <View style={styles.segmentListHeader}>
            <View style={styles.segmentBadgeSpacer} />
            <Text style={styles.segmentListHeaderText}>Timeline</Text>
            <Text style={[styles.segmentListHeaderText, styles.segmentListHeaderExposure]}>
              Exposure (%AR·h)
            </Text>
          </View>
          <ScrollView style={styles.segmentList} nestedScrollEnabled>
            {timeline.map((item, i) => {
              const row = timelineRowContent(item);
              const { color, label } = EXPOSURE_IO_CONFIG[row.io];
              const Icon = EXPOSURE_IO_ICONS[row.io];
              return (
                <View key={`${item.type}-${row.startTime}-${i}`} style={styles.segmentRow}>
                  {/* Same icon badge as the map's stay dots, so a row is
                      matched to the map by shape and color alone. */}
                  <View
                    style={[
                      styles.segmentBadge,
                      { backgroundColor: row.inHk ? color : EXPOSURE_MAP_CONFIG.outsideHkColor },
                    ]}
                  >
                    <Icon size={12} color="#fff" />
                  </View>
                  <View style={styles.segmentInfo}>
                    <Text style={styles.segmentTime}>
                      {formatTime(row.startTime)} – {formatTime(row.endTime)}{' '}
                      ({formatDuration(row.durationMs)})
                    </Text>
                    <Text style={styles.segmentLocation} numberOfLines={1}>
                      {label}
                      {row.detail && ` · ${row.detail}`}
                      {!row.inHk && ' · Outside HK'}
                    </Text>
                  </View>
                  {/* "—" not "0.000": outside HK means "not calculated", not zero. */}
                  <Text style={styles.segmentExposure}>
                    {row.inHk ? row.exposure.toFixed(3) : '—'}
                  </Text>
                </View>
              );
            })}
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
  segmentBadgeSpacer: { width: 22, marginRight: 10 },
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
  segmentBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentInfo: { flex: 1 },
  segmentTime: { fontSize: 13, fontWeight: '600', color: '#1C1C1E' },
  segmentLocation: { fontSize: 11, color: '#8E8E93', marginTop: 2 },
  segmentExposure: { fontSize: 14, fontWeight: '700', color: '#1C1C1E' },
});

export default ExposureReportView;
