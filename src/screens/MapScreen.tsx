// src/screens/MapScreen.tsx
import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import MapView, {
  Marker,
  Overlay,
  PROVIDER_GOOGLE,
  Region,
  MapPressEvent,
} from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Navigation, Play, Square } from 'lucide-react-native';
import Slider from '@react-native-community/slider';
import { useLocation } from '../utils/useLocation';
import { useHeatConditions } from '../hooks/useHeatData';
import { useHeatIndexTile } from '../hooks/useHeatIndexTile';
import { useHeatIndexForecastTiles } from '../hooks/useHeatIndexForecastTiles';
import { useAqhiData } from '../hooks/useAqhiData';
import { useIdwOverlayImage } from '../hooks/useIdwOverlayImage';
import { useAqhiForecastTiles } from '../hooks/useAqhiForecastTiles';
import { useEnviTile } from '../hooks/useEnviTile';
import { useEnviForecastTiles } from '../hooks/useEnviForecastTiles';
import { estimateAqhiAt, valueToAqhiColor } from '../utils/aqhiUtils';
import { enviTileSource, pinEnviLevel } from '../utils/enviMapLayer';
import { FALLBACK_CENTER, resolveDataCenter } from '../config/locationConfig';
import MapLayerPicker from '../components/MapLayerPicker';
import MapLayerReturnChip from '../components/MapLayerReturnChip';
import MapPointCard from '../components/MapPointCard';
import DualStatPin from '../components/DualStatPin';
import { MapLayer } from '../types/mapSettings';
import { MapPlacePin } from '../hooks/useMapPlacePins';
import { usePraiseAqhiTile } from '../hooks/usePraiseAqhiTile';
import { isPraiseConfigured } from '../config/praiseConfig';
import AqhiLegend from '../components/AqhiLegend';
import HeatLegend from '../components/HeatLegend';
import EnviMapLegend from '../components/EnviMapLegend';
import {
  fetchPraisePointData,
  toHkTimestamp,
  formatHkTimestampLabel,
} from '../services/praiseApi';
import { useMapSettings } from '../hooks/useMapSettings';
import {
  ENVI_MAP_LEGEND_CONFIG,
  ENVI_MAP_SOURCE,
  MAP_LAYER_CONFIG,
  MAP_LAYER_ORDER,
  MAP_LAYER_PICKER_CONFIG,
  MAP_LAYER_RETURN_CHIP_CONFIG,
  MAP_POINT_CARD_CONFIG,
} from '../config/mapLayerConfig';
import { MAP_LAYER_COPY } from '../config/alertCopy';

const BOTTOM_ROW_HEIGHT = 58; // approx height of the opacity-bar/locate-button row, used to space things above it
const { buttonSize: PICKER_SIZE, buttonSizeLarge: PICKER_SIZE_LARGE } = MAP_LAYER_PICKER_CONFIG;

// Heat values for the pin aren't stored here — they're looked up from the
// API by useHeatConditions, keyed on these coordinates.
type SelectedPoint = {
  latitude: number;
  longitude: number;
  aqhi: number | null; // null until AQHI samples arrive → "--"
};

type Coordinates = {
  latitude: number;
  longitude: number;
};

// What a screen holding the map can ask of it. The map lives inside a
// Modal, whose onRequestClose receives Android's back button before any
// BackHandler listener here would, so the Modal asks the map first.
export type MapScreenHandle = {
  // Closes the map's own open panel (the tapped point's details); true if
  // it did, so back doesn't also close the map.
  handleBack: () => boolean;
};

type Props = {
  // Chosen by the screen that owns the map — starts on the Environmental
  // Index (useDefaultMapLayer); Home's preview is fixed to it.
  layer: MapLayer;
  // Without it the layer is fixed and the picker is hidden.
  onLayerChange?: (layer: MapLayer) => void;
  overrideCenter?: Coordinates;
  showModeToggle?: boolean;
  // The opacity slider and locate button. Off for a small preview.
  showLayerControls?: boolean;
  // Makes this a preview: the map itself doesn't pan, zoom or take point
  // taps, and a tap anywhere on it calls this (e.g. to open full screen).
  // The tap area sits under the map's own controls.
  onPreviewPress?: () => void;
  enableForecastPlayback?: boolean;
  fullscreen?: boolean;
  // Saved places to pin on the map.
  places?: MapPlacePin[];
  onPlacePress?: (placeId: string) => void;
};

const MapScreen = forwardRef<MapScreenHandle, Props>(function MapScreenView(
  {
    layer: mapLayer,
    onLayerChange,
    overrideCenter,
    showModeToggle = true,
    showLayerControls = true,
    onPreviewPress,
    enableForecastPlayback = false,
    fullscreen = false,
    places = [],
    onPlacePress,
  },
  ref,
) {
  const { coords, loading: locating } = useLocation();
  const { settings: mapSettings } = useMapSettings();
  const insets = useSafeAreaInsets();
  const [forecastPlaying, setForecastPlaying] = useState(false);
  const [frameIndex, setFrameIndex] = useState(0);
  // The tapped point's "Details" on the index layer.
  const [pointDetailsOpen, setPointDetailsOpen] = useState(false);

  // The three layers (Environmental Index, heat index, AQHI) are drawn by
  // the same code: everything below (current tile, opacity slider, legend
  // styling, Play Forecast, locate button) is shared, so they always look
  // and behave the same — only the data differs.
  const showPicker = showModeToggle && onLayerChange !== undefined;
  const isPreview = onPreviewPress !== undefined;
  const isDetailLayer = mapLayer !== MAP_LAYER_ORDER.primary;

  useImperativeHandle(
    ref,
    () => ({
      handleBack: () => {
        if (!pointDetailsOpen) return false;
        setPointDetailsOpen(false);
        return true;
      },
    }),
    [pointDetailsOpen],
  );

  // 1. SPLIT STATES: One for the slider UI, one for the actual map overlay
  const [sliderOpacity, setSliderOpacity] = useState(
    MAP_LAYER_CONFIG.defaultOpacity,
  );
  const [mapOpacity, setMapOpacity] = useState(MAP_LAYER_CONFIG.defaultOpacity);

  const mapRef = useRef<MapView>(null);

  // dataCenter is null while still locating, so neither AQHI nor the
  // auto-placed pin shows the fallback spot's numbers first. The camera
  // (center) still needs somewhere to start, so it falls back right away.
  const dataCenter = overrideCenter ?? resolveDataCenter({ coords, loading: locating });
  const center = dataCenter ?? FALLBACK_CENTER;
  const { points: aqhiPoints } = useAqhiData(dataCenter);

  const initialRegion: Region = {
    latitude: center.latitude,
    longitude: center.longitude,
    latitudeDelta: 0.03,
    longitudeDelta: 0.03,
  };

  const [region, setRegion] = useState<Region>(initialRegion);
  const [selectedPoint, setSelectedPoint] = useState<SelectedPoint | null>(
    null,
  );

  const { conditions: selectedConditions, loading: selectedLoading } =
    useHeatConditions(selectedPoint);
  // While a new point loads, the hook still holds the previous point's
  // values — show "--" instead so the pin never shows another spot's numbers.
  const pinConditions = selectedLoading ? null : selectedConditions;
  const pinHeatIndex = pinConditions
    ? Math.round(pinConditions.heatIndexC)
    : null;
  const pinAirTemp = pinConditions
    ? Math.round(pinConditions.temperatureC)
    : null;
  const pinHumidity = pinConditions
    ? Math.round(pinConditions.relativeHumidityPct)
    : null;
  // The layer is part of it: the pin's content (square vs numbers) and so
  // its size change with the layer.
  const pinSignature = `${pinHeatIndex}-${pinAirTemp}-${pinHumidity}-${selectedPoint?.aqhi}-${mapLayer}`;

  const weightedAqhiPoints = aqhiPoints.map(p => ({
    latitude: p.latitude,
    longitude: p.longitude,
    value: p.aqhi,
  }));

  const aqhiOverlayUri = useIdwOverlayImage(
    weightedAqhiPoints,
    region,
    valueToAqhiColor,
  );

  const { tile: praiseAqhiTile } = usePraiseAqhiTile(
    region,
    mapLayer === 'aqhi' && isPraiseConfigured() && !forecastPlaying,
  );
  const { tile: heatIndexTile } = useHeatIndexTile(
    region,
    mapLayer === 'heat' && !forecastPlaying,
  );
  const { tile: enviTile } = useEnviTile(
    region,
    mapLayer === 'envi' && !forecastPlaying,
  );
  const layerTile =
    mapLayer === 'heat' ? heatIndexTile : mapLayer === 'aqhi' ? praiseAqhiTile : enviTile;

  // The index layer's frames, if it has any. None during the AQHI demo
  // (useEnviForecastTiles), and with none there is no Play button on this
  // layer.
  const enviForecast = useEnviForecastTiles(
    region,
    enableForecastPlayback && mapLayer === 'envi',
  );

  // AQHI's forecast needs PRAISE configured; heat's comes from the spatial
  // temperature API, which is always on.
  const forecastAvailable =
    enableForecastPlayback &&
    (mapLayer === 'heat' ||
      (mapLayer === 'aqhi' && isPraiseConfigured()) ||
      (mapLayer === 'envi' && (enviForecast.loading || enviForecast.frames.length > 0)));

  // Fetches (and fully pre-caches) forecast frames as soon as a hazard layer
  // is up, well before the user taps Play — so playback starts instantly
  // instead of stalling on network fetches for the first loop.
  const aqhiForecast = useAqhiForecastTiles(
    region,
    forecastAvailable && mapLayer === 'aqhi',
  );
  const heatForecast = useHeatIndexForecastTiles(
    region,
    forecastAvailable && mapLayer === 'heat',
  );
  const { frames: forecastFrames, loading: forecastLoading } =
    mapLayer === 'heat' ? heatForecast : mapLayer === 'aqhi' ? aqhiForecast : enviForecast;
  const forecastReady = !forecastLoading && forecastFrames.length > 0;

  // Switching layers mid-playback would keep animating the old layer's
  // frames, so playback always stops on a layer change. The point details
  // belong to the index layer, so they close with it too.
  useEffect(() => {
    setForecastPlaying(false);
    setPointDetailsOpen(false);
  }, [mapLayer]);

  // Resets to the first frame whenever a fresh batch comes in (e.g. after panning)
  useEffect(() => {
    setFrameIndex(0);
  }, [forecastFrames]);

  useEffect(() => {
    if (!forecastPlaying || forecastFrames.length === 0) return;
    const interval = setInterval(() => {
      setFrameIndex(prev => (prev + 1) % forecastFrames.length);
    }, MAP_LAYER_CONFIG.frameIntervalMs);
    return () => clearInterval(interval);
  }, [forecastPlaying, forecastFrames.length]);

  const activeFrame = forecastPlaying ? forecastFrames[frameIndex] : undefined;

  const toggleForecastPlayback = () => {
    if (!forecastReady) return;
    setForecastPlaying(prev => !prev);
    setFrameIndex(0);
  };

  const north = region.latitude + Math.abs(region.latitudeDelta) / 2;
  const south = region.latitude - Math.abs(region.latitudeDelta) / 2;
  const east = region.longitude + Math.abs(region.longitudeDelta) / 2;
  const west = region.longitude - Math.abs(region.longitudeDelta) / 2;
  const overlayBounds: [[number, number], [number, number]] = [
    [north, east],
    [south, west],
  ];

  const fetchExactAqhiForPoint = async (
    latitude: number,
    longitude: number,
  ) => {
    if (!isPraiseConfigured()) return;
    try {
      const ts = toHkTimestamp();
      const data = await fetchPraisePointData(latitude, longitude, ts, ts, [
        'AQHIBN2024',
        'AQHIBN',
      ]);
      const exactAqhi = data.AQHIBN2024?.[0] ?? data.AQHIBN?.[0];
      if (typeof exactAqhi === 'number') {
        setSelectedPoint(prev => {
          if (
            prev &&
            prev.latitude === latitude &&
            prev.longitude === longitude
          ) {
            return { ...prev, aqhi: exactAqhi };
          }
          return prev;
        });
      }
    } catch (error) {
      console.log('Failed to fetch exact AQHI for marker', error);
    }
  };

  const placeMarkerAt = (latitude: number, longitude: number) => {
    setSelectedPoint({
      latitude,
      longitude,
      aqhi: estimateAqhiAt(latitude, longitude, aqhiPoints),
    });
  };

  const handleMapPress = (event: MapPressEvent) => {
    // Android also reports a tap on a marker (e.g. a place pin) as a map
    // press — that must not move the tapped-point pin underneath it.
    if (event.nativeEvent.action === 'marker-press') return;
    const { latitude, longitude } = event.nativeEvent.coordinate;
    placeMarkerAt(latitude, longitude);
    fetchExactAqhiForPoint(latitude, longitude);
  };

  const handlePoiClick = (event: any) => {
    const { coordinate } = event.nativeEvent;
    placeMarkerAt(coordinate.latitude, coordinate.longitude);
    fetchExactAqhiForPoint(coordinate.latitude, coordinate.longitude);
  };

  useEffect(() => {
    if (dataCenter && weightedAqhiPoints.length > 0 && !selectedPoint) {
      placeMarkerAt(dataCenter.latitude, dataCenter.longitude);
    }
  }, [dataCenter?.latitude, dataCenter?.longitude, weightedAqhiPoints.length]);

  const recenter = () => {
    placeMarkerAt(center.latitude, center.longitude);
    mapRef.current?.animateToRegion({
      latitude: center.latitude,
      longitude: center.longitude,
      latitudeDelta: 0.03,
      longitudeDelta: 0.03,
    });
  };

  // Layers whose picture is AQHI's: the AQHI layer, and the index layer
  // while its demo borrows the AQHI tile. Until that tile loads they show
  // the IDW estimate from the AQHI samples — nothing without PRAISE, since
  // there are no samples then.
  const usesAqhiPicture =
    mapLayer === 'aqhi' ||
    (mapLayer === 'envi' && enviTileSource(ENVI_MAP_SOURCE, isPraiseConfigured()) === 'aqhi');
  const showLayerTile = !!layerTile && !activeFrame;
  const showFallbackAqhiOverlay =
    usesAqhiPicture && !showLayerTile && !activeFrame && !!aqhiOverlayUri;

  // The tapped point's card under the map (index layer only; a preview
  // takes no point taps).
  const showPointCard = mapLayer === 'envi' && !!selectedPoint && !isPreview;
  // The Play button and the point card are stacked just above the bottom
  // controls (or the map's bottom edge, without them).
  const bottomStackOffset = showLayerControls
    ? fullscreen
      ? insets.bottom + 16 + BOTTOM_ROW_HEIGHT + 16
      : 64
    : 8;
  const topBarTop = fullscreen ? insets.top + 16 : 16;
  const pickerSize = fullscreen ? PICKER_SIZE_LARGE : PICKER_SIZE;
  const compactLegend = mapLayer === 'envi' && isPreview;

  const legend =
    mapLayer === 'envi' ? (
      <EnviMapLegend variant={compactLegend ? 'compact' : 'vertical'} opacity={mapOpacity} />
    ) : mapLayer === 'aqhi' ? (
      <AqhiLegend />
    ) : (
      <HeatLegend />
    );

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        mapType={mapSettings.mapType}
        // Newer Google Maps SDK builds auto-switch the "standard" style to a
        // dark theme when the device is in system dark mode; forcing "light"
        // keeps the map matching Google Maps' own default light look.
        userInterfaceStyle="light"
        showsBuildings={false}
        pitchEnabled={false}
        style={StyleSheet.absoluteFill}
        initialRegion={initialRegion}
        onRegionChangeComplete={setRegion}
        onPress={handleMapPress}
        onPoiClick={handlePoiClick}
        showsUserLocation={!overrideCenter}
        showsMyLocationButton={false}
      >
        {showLayerTile && (
          <Overlay
            // 2. FORCE REMOUNT: Use mapOpacity as the key so it only rebuilds
            // when sliding finishes (and the layer, so a switch swaps images).
            key={`${mapLayer}-real-${mapOpacity}`}
            image={{ uri: layerTile!.uri }}
            bounds={layerTile!.bounds}
            opacity={mapOpacity}
          />
        )}

        {showFallbackAqhiOverlay && (
          <Overlay
            key={`${mapLayer}-fallback-${mapOpacity}`}
            image={{ uri: aqhiOverlayUri! }}
            bounds={overlayBounds}
            opacity={mapOpacity}
          />
        )}

        {activeFrame && (
          <Overlay
            key={`${mapLayer}-forecast-${activeFrame.ts}`}
            image={{ uri: activeFrame.uri }}
            bounds={activeFrame.bounds}
            opacity={mapOpacity}
          />
        )}

        {places.map(place => (
          <Marker
            // Same remount-on-values trick as the tapped-point marker below,
            // so Android re-measures the pin once its values arrive — and
            // when its category (so its icon), its index level or the layer
            // (square vs number) changes.
            key={`place-${place.id}-${place.category}-${place.heatIndex}-${place.aqhi}-${pinEnviLevel(place)}-${mapLayer}`}
            coordinate={{ latitude: place.latitude, longitude: place.longitude }}
            anchor={{ x: 0.5, y: 1 }}
            zIndex={2}
            tracksViewChanges={true}
            onPress={onPlacePress ? () => onPlacePress(place.id) : undefined}
          >
            <DualStatPin
              title={place.label}
              category={place.category}
              temperature={place.heatIndex}
              aqhi={place.aqhi}
              // The index square on the index layer, else only the value
              // of the hazard on screen.
              layer={mapLayer}
            />
          </Marker>
        ))}

        {selectedPoint && (
          <Marker
            // Android snapshots a custom marker at its first layout size; if
            // the content later grows (values arriving), the overflow — the
            // pin icon at the bottom — gets clipped off. Keying on the shown
            // values remounts the marker so it re-measures with them.
            key={`marker-${selectedPoint.latitude.toFixed(
              4,
            )}-${selectedPoint.longitude.toFixed(4)}-${pinSignature}`}
            coordinate={{
              latitude: selectedPoint.latitude,
              longitude: selectedPoint.longitude,
            }}
            anchor={{ x: 0.5, y: 1 }}
            zIndex={3}
            tracksViewChanges={true}
          >
            {mapLayer === 'envi' ? (
              // Square and level name only: the readings are behind the
              // card's "Details" under the map (a pin can't hold a button).
              <DualStatPin
                temperature={pinHeatIndex}
                aqhi={selectedPoint.aqhi}
                layer="envi"
                showLevelName
              />
            ) : (
              <DualStatPin
                temperature={pinHeatIndex}
                airTemperature={pinAirTemp}
                humidity={pinHumidity}
                aqhi={selectedPoint.aqhi}
              />
            )}
          </Marker>
        )}
      </MapView>

      {onPreviewPress && (
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={0.9}
          onPress={onPreviewPress}
          accessibilityRole="button"
          accessibilityLabel={MAP_LAYER_COPY.openFullscreenLabel}
        />
      )}

      {compactLegend ? (
        // The small preview: one row along the bottom, out of the way of
        // the pins.
        <View style={styles.legendCompact} pointerEvents="none">
          {legend}
        </View>
      ) : (
        <View
          style={[
            styles.legendContainerRight,
            // Nothing above or below it to clear (no picker / no control
            // row), so the legend can use the map's full height.
            !showPicker && styles.legendNoPicker,
            !showLayerControls && styles.legendNoControls,
            fullscreen && {
              top: insets.top + 16 + PICKER_SIZE_LARGE + 12,
              bottom: insets.bottom + 16 + BOTTOM_ROW_HEIGHT + 16,
            },
          ]}
        >
          {legend}
        </View>
      )}

      {showLayerControls && (
        <View
          style={[
            styles.bottomRow,
            fullscreen
              ? {
                  bottom: insets.bottom + 16,
                  left: 16,
                  right: 16,
                }
              : { bottom: 8, left: 8, right: 8 },
          ]}
        >
          <View style={styles.opacityControl}>
            <Text style={styles.opacityLabel}>
              {MAP_LAYER_COPY.opacityLabel(Math.round(sliderOpacity * 100))}
            </Text>
            <Slider
              style={styles.opacitySlider}
              minimumValue={0.1}
              maximumValue={0.9}
              step={0.1} // 3. ADD STEP: Prevents erratic micro-updates
              value={sliderOpacity}
              onValueChange={setSliderOpacity} // Updates UI smoothly while dragging
              onSlidingComplete={setMapOpacity} // Updates the actual map overlay when user lets go
              minimumTrackTintColor="#D9534F"
              maximumTrackTintColor="#ccc"
            />
          </View>

          <TouchableOpacity
            style={[
              styles.locateButton,
              fullscreen && styles.locateButtonLarge,
            ]}
            onPress={recenter}
            accessibilityRole="button"
            accessibilityLabel={MAP_LAYER_COPY.locateLabel}
          >
            <Navigation
              size={fullscreen ? 24 : 20}
              color="#FFFFFF"
              fill="#FFFFFF"
            />
          </TouchableOpacity>
        </View>
      )}

      {(forecastAvailable || showPointCard) && (
        <View
          style={[
            styles.bottomStack,
            fullscreen ? styles.bottomStackFullscreen : styles.bottomStackSmall,
            { bottom: bottomStackOffset },
          ]}
          // Empty space in the stack still lets the map be dragged.
          pointerEvents="box-none"
        >
          {forecastAvailable && (
            <TouchableOpacity
              style={[
                styles.playForecastButton,
                !forecastReady && styles.playForecastButtonDisabled,
                fullscreen && { paddingVertical: 14, paddingHorizontal: 22 },
              ]}
              onPress={toggleForecastPlayback}
              disabled={!forecastReady}
              accessibilityRole="button"
              accessibilityLabel={
                forecastPlaying
                  ? MAP_LAYER_COPY.stopForecastLabel
                  : MAP_LAYER_COPY.playForecastLabel
              }
            >
              {!forecastReady ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : forecastPlaying ? (
                <Square size={16} color="#FFFFFF" fill="#FFFFFF" />
              ) : (
                <Play size={16} color="#FFFFFF" fill="#FFFFFF" />
              )}
              <Text
                style={[
                  styles.playForecastText,
                  fullscreen && { fontSize: 15 },
                ]}
              >
                {!forecastReady
                  ? MAP_LAYER_COPY.loadingForecast
                  : forecastPlaying
                  ? activeFrame
                    ? formatHkTimestampLabel(activeFrame.ts)
                    : MAP_LAYER_COPY.stopForecast
                  : MAP_LAYER_COPY.playForecast}
              </Text>
            </TouchableOpacity>
          )}

          {showPointCard && (
            <MapPointCard
              readings={{
                heatIndex: pinHeatIndex,
                aqhi: selectedPoint!.aqhi,
                temperature: pinAirTemp,
                humidity: pinHumidity,
              }}
              expanded={pointDetailsOpen}
              onToggle={() => setPointDetailsOpen(open => !open)}
            />
          )}
        </View>
      )}

      {showPicker && (
        <View style={[styles.topBar, { top: topBarTop }]}>
          <MapLayerPicker
            layer={mapLayer}
            onChange={onLayerChange}
            large={fullscreen}
          />
        </View>
      )}

      {/* A detail layer is up: one tap back to the index. In its own row
          under the top controls, centred clear of the back button and
          legend. */}
      {showPicker && isDetailLayer && (
        <View
          style={[
            styles.returnChipRow,
            { top: topBarTop + pickerSize + MAP_LAYER_RETURN_CHIP_CONFIG.gapBelowTopBar },
          ]}
          pointerEvents="box-none"
        >
          <MapLayerReturnChip
            layer={mapLayer}
            onPress={() => onLayerChange(MAP_LAYER_ORDER.primary)}
          />
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: { flex: 1, borderRadius: 16, overflow: 'hidden' },
  topBar: { position: 'absolute', right: 16 },
  returnChipRow: {
    position: 'absolute',
    left: MAP_LAYER_RETURN_CHIP_CONFIG.sideInset,
    right: MAP_LAYER_RETURN_CHIP_CONFIG.sideInset,
    alignItems: 'center',
  },
  // Sits at the end of the bottom row, beside the opacity slider.
  locateButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#2B7A9E',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
  },
  locateButtonLarge: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  legendContainerRight: {
    position: 'absolute',
    top: 60,
    right: 8,
    bottom: 70,
  },
  legendNoPicker: { top: 8 },
  legendNoControls: { bottom: 8 },
  legendCompact: {
    position: 'absolute',
    left: ENVI_MAP_LEGEND_CONFIG.compactInset,
    bottom: ENVI_MAP_LEGEND_CONFIG.compactInset,
  },
  bottomRow: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bottomStack: {
    position: 'absolute',
    gap: MAP_POINT_CARD_CONFIG.gapAboveControls,
  },
  // Same side insets as the bottom row of controls.
  bottomStackFullscreen: { left: 16, right: 16 },
  bottomStackSmall: { left: 8, right: 8 },
  opacityControl: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  opacityLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#333',
    marginBottom: -4,
  },
  opacitySlider: {
    width: '100%',
    height: 34,
  },
  playForecastButton: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#2B7A9E',
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 18,
    elevation: 5,
  },
  playForecastButtonDisabled: {
    backgroundColor: '#7A98A5',
  },
  playForecastText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});

export default MapScreen;
