// src/components/ExposureTrajectoryMap.tsx
import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MapView, { Polyline, Marker, Callout } from 'react-native-maps';
import { ExposureSegmentResult } from '../types/exposure';
import { exposureColor } from '../utils/exposureColor';

type Props = {
  segments: ExposureSegmentResult[];
};

const formatDuration = (ms: number): string => {
  const totalMinutes = Math.round(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  return `${hours}h ${minutes}m`;
};

const formatDateTime = (ms: number): string =>
  new Date(ms).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

// The colored trajectory (segment-pair polylines + tappable dots) shared by
// both a single day's ExposureReportView and a multi-day range view — same
// rendering regardless of how many calendar days the segments span.
const ExposureTrajectoryMap: React.FC<Props> = ({ segments }) => {
  const maxExposure = useMemo(
    () => Math.max(0, ...segments.map(s => s.exposure)),
    [segments],
  );

  const region = useMemo(() => {
    if (segments.length === 0) return null;
    const lats = segments.map(s => s.lat);
    const lons = segments.map(s => s.lon);
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
  }, [segments]);

  if (!region) return null;

  return (
    <View style={styles.mapContainer}>
      <MapView style={StyleSheet.absoluteFill} region={region}>
        {segments.slice(0, -1).map((segment, i) => {
          const next = segments[i + 1];
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
        {segments.map((segment, i) => (
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
                  {formatDateTime(segment.startTime)} – {formatDateTime(segment.endTime)}{' '}
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
  );
};

const styles = StyleSheet.create({
  mapContainer: {
    height: 220,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
  },
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
});

export default ExposureTrajectoryMap;
