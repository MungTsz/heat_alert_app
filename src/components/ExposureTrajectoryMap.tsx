// src/components/ExposureTrajectoryMap.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Maximize2, ArrowLeft } from 'lucide-react-native';
import MapView, { Marker, Region } from 'react-native-maps';
import { ExposureSegmentResult, ExposureStayCluster } from '../types/exposure';
import { EXPOSURE_MAP_CONFIG } from '../config/exposureMapConfig';
import { EXPOSURE_IO_CONFIG } from '../config/exposureIoConfig';
import { clusterStayPoints } from '../utils/geoClustering';
import { useBookmarkList } from '../hooks/useBookmarkList';
import ExposureStaySheet from './ExposureStaySheet';
import AddBookmarkModal from './AddBookmarkModal';

type Props = {
  segments: ExposureSegmentResult[];
};

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
  // Tapped dot → details sheet → (optionally) the Add place flow, seeded at
  // that dot. Two separate states so the sheet is closed before the Add
  // place modals open — stacking a third modal on top is unreliable on iOS.
  const [selectedCluster, setSelectedCluster] = useState<ExposureStayCluster | null>(null);
  const [bookmarkCluster, setBookmarkCluster] = useState<ExposureStayCluster | null>(null);
  const { bookmarks, addBookmark } = useBookmarkList();

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
    const { fitMinDeltaDeg, fitPaddingFactor } = EXPOSURE_MAP_CONFIG;
    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLon + maxLon) / 2,
      latitudeDelta: Math.max(maxLat - minLat, fitMinDeltaDeg) * fitPaddingFactor,
      longitudeDelta: Math.max(maxLon - minLon, fitMinDeltaDeg) * fitPaddingFactor,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [datasetKey]);

  const [region, setRegion] = useState<Region | null>(fittedRegion);
  const [prevDatasetKey, setPrevDatasetKey] = useState(datasetKey);
  if (datasetKey !== prevDatasetKey) {
    setPrevDatasetKey(datasetKey);
    setRegion(fittedRegion);
  }

  // initialRegion is only read on mount, so when this already-mounted map
  // is handed a different day's segments (bar-chart tap, date switch) the
  // camera would otherwise stay put — e.g. still over HK while that day's
  // points are far away, looking like "no points". Animate to the new fit
  // whenever the dataset (not just a live re-render) changes; skip the first
  // run since initialRegion already covers mount.
  const mapRef = useRef<MapView>(null);
  const fittedOnceRef = useRef(false);
  useEffect(() => {
    if (!fittedRegion) return;
    if (!fittedOnceRef.current) {
      fittedOnceRef.current = true;
      return;
    }
    mapRef.current?.animateToRegion(fittedRegion, EXPOSURE_MAP_CONFIG.refitAnimationMs);
  }, [fittedRegion]);

  if (!region) return null;

  const mapView = (
    <View style={fullscreen ? styles.mapContainerFullscreen : styles.mapContainer}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        // `region` (last settled camera, reset to the fit on dataset change)
        // rather than fittedRegion, so toggling fullscreen — which remounts
        // the MapView — keeps the user's current pan/zoom.
        initialRegion={region}
        onRegionChangeComplete={setRegion}
        // Pins light mode regardless of OS/system dark-mode — Google Maps
        // SDK and MapKit can otherwise switch to a dark theme automatically.
        userInterfaceStyle="light"
      >
        {clusters.map((cluster, i) => {
          const size = clusterDotSize(cluster.totalDurationMs);
          const ioColor = EXPOSURE_IO_CONFIG[cluster.io].color;
          const dotColor = cluster.inHk ? ioColor : EXPOSURE_MAP_CONFIG.outsideHkColor;
          return (
            <Marker
              key={`dot-${cluster.startTime}-${i}`}
              coordinate={{ latitude: cluster.lat, longitude: cluster.lon }}
              anchor={{ x: 0.5, y: 0.5 }}
              tracksViewChanges={!snapshotsReady}
              onPress={() => setSelectedCluster(cluster)}
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
                  !cluster.inHk && {
                    borderColor: EXPOSURE_MAP_CONFIG.outsideHkBorderColor,
                    opacity: EXPOSURE_MAP_CONFIG.outsideHkDotOpacity,
                  },
                ]}
              />
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

      {/* Rendered inside mapView so they stack above the fullscreen Modal
          too, not just the inline card. */}
      <ExposureStaySheet
        cluster={selectedCluster}
        onClose={() => setSelectedCluster(null)}
        onBookmark={cluster => {
          setSelectedCluster(null);
          setBookmarkCluster(cluster);
        }}
      />
      <AddBookmarkModal
        visible={bookmarkCluster !== null}
        onClose={() => setBookmarkCluster(null)}
        existingPlaces={bookmarks}
        currentLocation={null}
        initialCenter={
          bookmarkCluster
            ? { latitude: bookmarkCluster.lat, longitude: bookmarkCluster.lon }
            : undefined
        }
        onAdd={addBookmark}
      />
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
});

export default ExposureTrajectoryMap;
