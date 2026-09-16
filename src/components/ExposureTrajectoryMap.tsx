// src/components/ExposureTrajectoryMap.tsx
import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, LayoutChangeEvent } from 'react-native';
import MapView, { Polyline, Marker, Callout, Region } from 'react-native-maps';
import { ExposureSegmentResult, ExposureStayCluster } from '../types/exposure';
import { EXPOSURE_MAP_CONFIG } from '../config/exposureMapConfig';
import { clusterStayPoints, computeBearing, computeZoomLevel } from '../utils/geoClustering';

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

// Maps dwell duration to a dot diameter via sqrt (not linear/log): the dot is
// a circle, so scaling its radius by sqrt(duration) makes the rendered AREA
// scale linearly with dwell time — the standard area-encoding convention.
// Linear radius scaling would make a 2x-longer stay look 4x bigger; log
// would flatten the common 10min-2hr range users care about most.
const clusterDotSize = (totalDurationMs: number): number => {
  const { minDwellMsForSizing, maxDwellMsForSizing, minDotSizePx, maxDotSizePx } =
    EXPOSURE_MAP_CONFIG;
  const clamped = Math.min(Math.max(totalDurationMs, minDwellMsForSizing), maxDwellMsForSizing);
  const t =
    Math.sqrt(clamped - minDwellMsForSizing) /
    Math.sqrt(maxDwellMsForSizing - minDwellMsForSizing);
  return minDotSizePx + t * (maxDotSizePx - minDotSizePx);
};

type ArrowSegment = {
  key: string;
  latitude: number;
  longitude: number;
  bearing: number;
};

// The colored trajectory (segment-pair polylines + tappable dots) shared by
// both a single day's ExposureReportView and a multi-day range view — same
// rendering regardless of how many calendar days the segments span.
const ExposureTrajectoryMap: React.FC<Props> = ({ segments }) => {
  const clusters = useMemo<ExposureStayCluster[]>(
    () => clusterStayPoints(segments, EXPOSURE_MAP_CONFIG.stayRadiusMeters),
    [segments],
  );

  // Bounding-box fit of the whole dataset, recomputed only when the actual
  // dataset changes (not on every render) so it can seed initialRegion
  // without fighting the user's own pan/zoom afterwards.
  const datasetKey =
    segments.length > 0
      ? `${segments[0].startTime}-${segments[segments.length - 1].endTime}-${segments.length}`
      : '';
  const fittedRegion = useMemo<Region | null>(() => {
    if (clusters.length === 0) return null;
    const lats = clusters.map(c => c.lat);
    const lons = clusters.map(c => c.lon);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [datasetKey]);

  const [region, setRegion] = useState<Region | null>(fittedRegion);
  const [prevDatasetKey, setPrevDatasetKey] = useState(datasetKey);
  if (datasetKey !== prevDatasetKey) {
    setPrevDatasetKey(datasetKey);
    setRegion(fittedRegion);
  }

  const [containerWidthPx, setContainerWidthPx] = useState<number | null>(null);
  const handleLayout = (e: LayoutChangeEvent) => {
    setContainerWidthPx(e.nativeEvent.layout.width);
  };

  const showArrows = useMemo(() => {
    if (!region || containerWidthPx == null) return false;
    return (
      computeZoomLevel(region.longitudeDelta, containerWidthPx) >=
      EXPOSURE_MAP_CONFIG.arrowMinZoomLevel
    );
  }, [region, containerWidthPx]);

  // Geometry is expensive-ish (bearing per pair) and purely a function of the
  // clusters, so it's memoized independent of region/zoom — panning/zooming
  // only toggles the cheap `showArrows` boolean, never recomputes this.
  const arrowSegments = useMemo<ArrowSegment[]>(() => {
    const result: ArrowSegment[] = [];
    for (let i = 0; i < clusters.length - 1; i++) {
      const a = clusters[i];
      const b = clusters[i + 1];
      result.push({
        key: `arrow-${a.startTime}-${i}`,
        latitude: (a.lat + b.lat) / 2,
        longitude: (a.lon + b.lon) / 2,
        bearing: computeBearing(a.lat, a.lon, b.lat, b.lon),
      });
    }
    return result;
  }, [clusters]);

  if (!region) return null;

  return (
    <View style={styles.mapContainer} onLayout={handleLayout}>
      <MapView
        style={StyleSheet.absoluteFill}
        initialRegion={fittedRegion ?? undefined}
        onRegionChangeComplete={setRegion}
        // Pins light mode regardless of OS/system dark-mode — Google Maps
        // SDK and MapKit can otherwise switch to a dark theme automatically.
        userInterfaceStyle="light"
      >
        {clusters.slice(0, -1).map((cluster, i) => {
          const next = clusters[i + 1];
          return (
            <Polyline
              key={`line-${cluster.startTime}-${i}`}
              coordinates={[
                { latitude: cluster.lat, longitude: cluster.lon },
                { latitude: next.lat, longitude: next.lon },
              ]}
              strokeColor={EXPOSURE_MAP_CONFIG.trackColor}
              strokeWidth={4}
            />
          );
        })}
        {showArrows &&
          arrowSegments.map(arrow => (
            <Marker
              key={arrow.key}
              coordinate={{ latitude: arrow.latitude, longitude: arrow.longitude }}
              anchor={{ x: 0.5, y: 0.5 }}
              tracksViewChanges={false}
            >
              <View
                style={[styles.arrow, { transform: [{ rotate: `${arrow.bearing}deg` }] }]}
              />
            </Marker>
          ))}
        {clusters.map((cluster, i) => {
          const size = clusterDotSize(cluster.totalDurationMs);
          const dotColor =
            cluster.io === 'Indoor'
              ? EXPOSURE_MAP_CONFIG.indoorColor
              : EXPOSURE_MAP_CONFIG.outdoorColor;
          return (
            <Marker
              key={`dot-${cluster.startTime}-${i}`}
              coordinate={{ latitude: cluster.lat, longitude: cluster.lon }}
              anchor={{ x: 0.5, y: 0.5 }}
              tracksViewChanges={false}
            >
              <View
                style={[
                  styles.mapDot,
                  {
                    width: size,
                    height: size,
                    borderRadius: size / 2,
                    backgroundColor: dotColor,
                  },
                ]}
              />
              <Callout>
                <View style={styles.calloutBox}>
                  <Text style={styles.calloutTime}>
                    {formatDateTime(cluster.startTime)} – {formatDateTime(cluster.endTime)}{' '}
                    ({formatDuration(cluster.totalDurationMs)})
                  </Text>
                  <Text style={styles.calloutLocation}>
                    {cluster.lat.toFixed(5)}, {cluster.lon.toFixed(5)}
                  </Text>
                  <Text style={[styles.calloutIo, { color: dotColor }]}>{cluster.io}</Text>
                  <Text style={styles.calloutExposure}>
                    Total exposure: {cluster.totalExposure.toFixed(3)} %AR·h
                  </Text>
                  {cluster.mergedSegmentCount > 1 && (
                    <Text style={styles.calloutMerged}>
                      Visits merged: {cluster.mergedSegmentCount}
                    </Text>
                  )}
                </View>
              </Callout>
            </Marker>
          );
        })}
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
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.9)',
  },
  arrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderBottomWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: EXPOSURE_MAP_CONFIG.arrowColor,
  },
  calloutBox: { minWidth: 160, padding: 4 },
  calloutTime: { fontSize: 12, fontWeight: '700', color: '#1C1C1E' },
  calloutLocation: { fontSize: 11, color: '#8E8E93', marginTop: 2 },
  calloutIo: { fontSize: 11, fontWeight: '700', marginTop: 4 },
  calloutExposure: { fontSize: 12, fontWeight: '600', color: '#1C1C1E', marginTop: 4 },
  calloutMerged: { fontSize: 11, color: '#8E8E93', marginTop: 2 },
});

export default ExposureTrajectoryMap;
