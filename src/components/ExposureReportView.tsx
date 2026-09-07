// src/components/ExposureReportView.tsx
import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import MapView, { Polyline, Marker, Callout } from 'react-native-maps';
import { AlertTriangle } from 'lucide-react-native';
import { ExposureReport } from '../types/exposure';
import { isExposureDataMocked } from '../data/exposure';

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

// Relative color scale (green -> red), normalized to this report's own
// segment exposures. Exposure has no fixed classification scale like heat
// index/AQHI do, so a self-contained gradient is the right fit here rather
// than reusing those domains' band colors.
const exposureColor = (value: number, max: number): string => {
  if (max <= 0) return 'rgba(130, 200, 60, 0.9)';
  const t = Math.max(0, Math.min(1, value / max));
  const r = Math.round(130 + (220 - 130) * t);
  const g = Math.round(200 - (200 - 20) * t);
  const b = Math.round(60 - (60 - 20) * t);
  return `rgba(${r}, ${g}, ${b}, 0.9)`;
};

const ExposureReportView: React.FC<Props> = ({ report, title }) => {
  const maxExposure = useMemo(
    () => Math.max(0, ...report.segments.map(s => s.exposure)),
    [report.segments],
  );

  const region = useMemo(() => {
    if (report.segments.length === 0) return null;
    const lats = report.segments.map(s => s.lat);
    const lons = report.segments.map(s => s.lon);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLon = Math.min(...lons);
    const maxLon = Math.max(...lons);
    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLon + maxLon) / 2,
      latitudeDelta: Math.max(maxLat - minLat, 0.005) * 1.6,
      longitudeDelta: Math.max(maxLon - minLon, 0.005) * 1.6,
    };
  }, [report.segments]);

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

      {region && (
        <View style={styles.mapContainer}>
          <MapView style={StyleSheet.absoluteFill} region={region}>
            {report.segments.slice(0, -1).map((segment, i) => {
              const next = report.segments[i + 1];
              return (
                <Polyline
                  key={`line-${segment.startTime}-${i}`}
                  coordinates={[
                    { latitude: segment.lat, longitude: segment.lon },
                    { latitude: next.lat, longitude: next.lon },
                  ]}
                  strokeColor={exposureColor(segment.exposure, maxExposure)}
                  strokeWidth={4}
                />
              );
            })}
            {report.segments.map((segment, i) => (
              <Marker
                key={`dot-${segment.startTime}-${i}`}
                coordinate={{ latitude: segment.lat, longitude: segment.lon }}
                anchor={{ x: 0.5, y: 0.5 }}
                tracksViewChanges={false}
              >
                <View
                  style={[
                    styles.mapDot,
                    { backgroundColor: exposureColor(segment.exposure, maxExposure) },
                  ]}
                />
                <Callout>
                  <View style={styles.calloutBox}>
                    <Text style={styles.calloutTime}>
                      {formatTime(segment.startTime)} – {formatTime(segment.endTime)}{' '}
                      ({formatDuration(segment.endTime - segment.startTime)})
                    </Text>
                    <Text style={styles.calloutLocation}>
                      {segment.lat.toFixed(5)}, {segment.lon.toFixed(5)}
                    </Text>
                    <Text style={styles.calloutExposure}>
                      Exposure: {segment.exposure.toFixed(3)} %AR·h
                    </Text>
                  </View>
                </Callout>
              </Marker>
            ))}
          </MapView>
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
  mapContainer: {
    height: 220,
    borderRadius: 16,
    overflow: 'hidden',
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
  mapDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.9)',
  },
  calloutBox: { minWidth: 160, padding: 4 },
  calloutTime: { fontSize: 12, fontWeight: '700', color: '#1C1C1E' },
  calloutLocation: { fontSize: 11, color: '#8E8E93', marginTop: 2 },
  calloutExposure: { fontSize: 12, fontWeight: '600', color: '#1C1C1E', marginTop: 4 },
  segmentInfo: { flex: 1 },
  segmentTime: { fontSize: 13, fontWeight: '600', color: '#1C1C1E' },
  segmentLocation: { fontSize: 11, color: '#8E8E93', marginTop: 2 },
  segmentExposure: { fontSize: 14, fontWeight: '700', color: '#1C1C1E' },
});

export default ExposureReportView;
