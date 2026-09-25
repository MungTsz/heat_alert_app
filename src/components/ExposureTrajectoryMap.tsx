// src/components/ExposureTrajectoryMap.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Maximize2, ArrowLeft } from 'lucide-react-native';
import MapView, { Marker, Callout, Region } from 'react-native-maps';
import { ExposureSegmentResult, ExposureStayCluster } from '../types/exposure';
import { EXPOSURE_MAP_CONFIG } from '../config/exposureMapConfig';
import { clusterStayPoints } from '../utils/geoClustering';

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

// The stay-point map, shared by both a single day's ExposureReportView and a
// multi-day range view — same rendering regardless of how many calendar days
// the segments span. Points-only: no routed/straight-line path between stay
// points is drawn, and no routing API is called.
const ExposureTrajectoryMap: React.FC<Props> = ({ segments }) => {
  const insets = useSafeAreaInsets();
  // Same MapView instance and geometry render inline (fixed-height card) or
  // full-screen (Modal) depending on this flag — avoids a second parallel
  // implementation of the marker JSX for the expand button feature.
  const [fullscreen, setFullscreen] = useState(false);

  const clusters = useMemo<ExposureStayCluster[]>(
    () => clusterStayPoints(segments, EXPOSURE_MAP_CONFIG.stayRadiusMeters),
    [segments],
  );

  // Custom-View dot Markers can end up permanently blank on Android if
  // tracksViewChanges is already false before the native layer captures its
  // first snapshot of the child view. Start "tracked" for one brief window
  // after the cluster set changes to force a fresh snapshot, then settle to
  // false for normal performance.
  const [snapshotsReady, setSnapshotsReady] = useState(false);
  useEffect(() => {
    setSnapshotsReady(false);
    const timer = setTimeout(
      () => setSnapshotsReady(true),
      EXPOSURE_MAP_CONFIG.markerSnapshotDelayMs,
    );
    return () => clearTimeout(timer);
  }, [clusters]);

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

  if (!region) return null;

  const mapView = (
    <View style={fullscreen ? styles.mapContainerFullscreen : styles.mapContainer}>
      <MapView
        style={StyleSheet.absoluteFill}
        initialRegion={fittedRegion ?? undefined}
        onRegionChangeComplete={setRegion}
        // Pins light mode regardless of OS/system dark-mode — Google Maps
        // SDK and MapKit can otherwise switch to a dark theme automatically.
        userInterfaceStyle="light"
      >
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
              tracksViewChanges={!snapshotsReady}
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

      <TouchableOpacity
        style={[
          styles.expandButton,
          fullscreen && [styles.expandButtonFullscreen, { top: insets.top + 16 }],
        ]}
        onPress={() => setFullscreen(f => !f)}
      >
        {fullscreen ? (
          <ArrowLeft size={26} color="#333" />
        ) : (
          <Maximize2 size={18} color="#333" />
        )}
      </TouchableOpacity>
    </View>
  );

  if (fullscreen) {
    return (
      <Modal visible animationType="slide" onRequestClose={() => setFullscreen(false)}>
        {mapView}
      </Modal>
    );
  }

  return mapView;
};

const styles = StyleSheet.create({
  mapContainer: {
    height: 220,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
  },
  // Flush full-device-size variant used inside the expand Modal — no rounded
  // corners/margin since it's the only content in that screen.
  mapContainerFullscreen: {
    flex: 1,
  },
  expandButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
  },
  // Repositioned/enlarged to match FullscreenMapModal's back button so the
  // "close full screen" affordance looks consistent across the app.
  expandButtonFullscreen: {
    left: 16,
    right: undefined,
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#FFFFFF',
  },
  mapDot: {
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.9)',
  },
  calloutBox: { minWidth: 160, padding: 4 },
  calloutTime: { fontSize: 12, fontWeight: '700', color: '#1C1C1E' },
  calloutLocation: { fontSize: 11, color: '#8E8E93', marginTop: 2 },
  calloutIo: { fontSize: 11, fontWeight: '700', marginTop: 4 },
  calloutExposure: { fontSize: 12, fontWeight: '600', color: '#1C1C1E', marginTop: 4 },
  calloutMerged: { fontSize: 11, color: '#8E8E93', marginTop: 2 },
});

export default ExposureTrajectoryMap;
