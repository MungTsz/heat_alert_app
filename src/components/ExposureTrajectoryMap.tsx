// src/components/ExposureTrajectoryMap.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Maximize2, ArrowLeft, ChevronUp } from 'lucide-react-native';
import MapView, { Marker, Polyline, Region } from 'react-native-maps';
import { ExposureSegmentResult, ExposureStayCluster, ExposureTripLeg } from '../types/exposure';
import { EXPOSURE_MAP_CONFIG } from '../config/exposureMapConfig';
import { EXPOSURE_IO_CONFIG, isIndoorIo } from '../config/exposureIoConfig';
import { EXPOSURE_IO_ICONS } from '../config/exposureIoIconConfig';
import { clusterStayPoints } from '../utils/geoClustering';
import {
  arrowViewport,
  buildTripLegs,
  placeDirectionArrows,
  quantizedMetersPerPx,
} from '../utils/exposureTrajectory';
import { useBookmarkList } from '../hooks/useBookmarkList';
import ExposureStaySheet from './ExposureStaySheet';
import ExposureTripSheet from './ExposureTripSheet';
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

const legColor = (leg: ExposureTripLeg): string =>
  leg.inHk ? EXPOSURE_IO_CONFIG[leg.io].color : EXPOSURE_MAP_CONFIG.outsideHkRouteColor;

// The day's trajectory, shared by a single day's ExposureReportView and the
// compact device view. Three layers, each answering one question:
// - stay dots (where was I?): sized by dwell time, indoor ones carry their
//   category icon so they read without the legend;
// - route lines (how did I get there?): one polyline per leg in its io
//   color, dashed where the path is a straight-line guess (underground MTR);
// - direction arrows (which way?): evenly spaced on screen along each leg.
// The lines connect the backend's own points; no routing API is called.
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
  const [selectedLeg, setSelectedLeg] = useState<ExposureTripLeg | null>(null);
  const { bookmarks, addBookmark } = useBookmarkList();

  const clusters = useMemo<ExposureStayCluster[]>(
    () => clusterStayPoints(segments, EXPOSURE_MAP_CONFIG.stayRadiusMeters),
    [segments],
  );
  // A lone route point with nothing after it (the day's last row) has no
  // line to draw — its time still shows in the day timeline.
  const legs = useMemo(
    () => buildTripLegs(segments).filter(leg => leg.path.length >= 2),
    [segments],
  );

  // Bounding-box fit of the whole dataset, recomputed only when the actual
  // dataset changes (not on every render) so it can seed initialRegion
  // without fighting the user's own pan/zoom afterwards. Every segment
  // counts, so the frame holds the routes, not just the stays.
  const datasetKey =
    segments.length > 0
      ? `${segments[0].startTime}-${segments[segments.length - 1].endTime}-${segments.length}`
      : '';
  const fittedRegion = useMemo<Region | null>(() => {
    if (segments.length === 0) return null;
    const lats = segments.map(s => s.lat);
    const lons = segments.map(s => s.lon);
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

  // Arrows are spaced in screen pixels, so they need the map's real height
  // (inline card vs full screen) and the current zoom. The scale is
  // quantized (see quantizedMetersPerPx), so panning never moves an arrow —
  // it only adds the ones that come into view.
  const [mapHeightPx, setMapHeightPx] = useState(0);
  const metersPerPx = region ? quantizedMetersPerPx(region.latitudeDelta, mapHeightPx) : null;
  const arrows = useMemo(
    () =>
      metersPerPx === null || !region
        ? []
        : placeDirectionArrows(
            legs,
            metersPerPx,
            {
              spacingPx: EXPOSURE_MAP_CONFIG.arrowSpacingPx,
              minLegLengthPx: EXPOSURE_MAP_CONFIG.minLegLengthForArrowPx,
              maxArrows: EXPOSURE_MAP_CONFIG.maxArrowMarkers,
            },
            arrowViewport(region, EXPOSURE_MAP_CONFIG.arrowViewportMarginFactor),
          ),
    [legs, metersPerPx, region],
  );

  // Custom-View Markers can end up permanently blank on Android if
  // tracksViewChanges is already false before the native layer captures its
  // first snapshot of the child view. Start "tracked" for one brief window
  // after the marker set changes (new day, or arrows re-spaced by a zoom) to
  // force a fresh snapshot, then settle to false for normal performance.
  const [snapshotsReady, setSnapshotsReady] = useState(false);
  useEffect(() => {
    setSnapshotsReady(false);
    const timer = setTimeout(
      () => setSnapshotsReady(true),
      EXPOSURE_MAP_CONFIG.markerSnapshotDelayMs,
    );
    return () => clearTimeout(timer);
  }, [clusters, arrows]);

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
    <View
      style={fullscreen ? styles.mapContainerFullscreen : styles.mapContainer}
      onLayout={e => setMapHeightPx(e.nativeEvent.layout.height)}
    >
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
        // North stays up: arrows are rotated in screen space by their
        // heading, and Marker's own `rotation`/`flat` (which would follow a
        // rotated map) aren't supported on Apple Maps.
        rotateEnabled={false}
        pitchEnabled={false}
      >
        {/* Casings first: Apple Maps ignores Polyline zIndex and stacks
            overlays in the order they're added. */}
        {legs.map((leg, i) => (
          <Polyline
            key={`casing-${i}`}
            coordinates={leg.path}
            strokeColor={EXPOSURE_MAP_CONFIG.routeCasingColor}
            strokeWidth={EXPOSURE_MAP_CONFIG.routeCasingWidthPx}
            lineCap="round"
            lineJoin="round"
            zIndex={1}
          />
        ))}
        {legs.map((leg, i) => (
          <Polyline
            key={`leg-${i}`}
            coordinates={leg.path}
            strokeColor={legColor(leg)}
            strokeWidth={EXPOSURE_MAP_CONFIG.routeLineWidthPx}
            lineDashPattern={
              leg.pathInferred ? EXPOSURE_MAP_CONFIG.inferredPathDashPattern : undefined
            }
            lineCap={leg.pathInferred ? 'butt' : 'round'}
            lineJoin="round"
            zIndex={2}
            tappable
            onPress={() => setSelectedLeg(leg)}
          />
        ))}

        {/* Arrows double as the easy tap target for a leg — a 4px line is
            hard to hit with a finger. */}
        {arrows.map((arrow, i) => {
          const leg = legs[arrow.legIndex];
          return (
            <Marker
              key={`arrow-${i}`}
              coordinate={{ latitude: arrow.latitude, longitude: arrow.longitude }}
              anchor={{ x: 0.5, y: 0.5 }}
              tracksViewChanges={!snapshotsReady}
              onPress={() => setSelectedLeg(leg)}
              zIndex={1}
            >
              <View style={[styles.arrowBadge, { backgroundColor: legColor(leg) }]}>
                <View style={{ transform: [{ rotate: `${arrow.headingDeg}deg` }] }}>
                  <ChevronUp
                    size={EXPOSURE_MAP_CONFIG.arrowIconSizePx}
                    color="#fff"
                    strokeWidth={3.5}
                  />
                </View>
              </View>
            </Marker>
          );
        })}

        {clusters.map((cluster, i) => {
          const indoor = isIndoorIo(cluster.io);
          const size = Math.max(
            clusterDotSize(cluster.totalDurationMs),
            indoor ? EXPOSURE_MAP_CONFIG.indoorStayMinDotSizePx : 0,
          );
          const { color } = EXPOSURE_IO_CONFIG[cluster.io];
          const Icon = EXPOSURE_IO_ICONS[cluster.io];
          const dotColor = cluster.inHk ? color : EXPOSURE_MAP_CONFIG.outsideHkColor;
          return (
            <Marker
              key={`dot-${cluster.startTime}-${i}`}
              coordinate={{ latitude: cluster.lat, longitude: cluster.lon }}
              anchor={{ x: 0.5, y: 0.5 }}
              tracksViewChanges={!snapshotsReady}
              onPress={() => setSelectedCluster(cluster)}
              // Above the arrows: a stay is the more specific thing to tap.
              zIndex={2}
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
              >
                {indoor && (
                  <Icon
                    size={size * EXPOSURE_MAP_CONFIG.stayIconScale}
                    // White on the light outside-HK fill would vanish.
                    color={cluster.inHk ? '#fff' : EXPOSURE_MAP_CONFIG.outsideHkBorderColor}
                  />
                )}
              </View>
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
      <ExposureTripSheet leg={selectedLeg} onClose={() => setSelectedLeg(null)} />
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowBadge: {
    width: EXPOSURE_MAP_CONFIG.arrowBadgeSizePx,
    height: EXPOSURE_MAP_CONFIG.arrowBadgeSizePx,
    borderRadius: EXPOSURE_MAP_CONFIG.arrowBadgeSizePx / 2,
    borderWidth: 1.5,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default ExposureTrajectoryMap;
