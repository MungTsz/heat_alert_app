// src/screens/MapScreen.tsx
import React, { useEffect, useRef, useState } from 'react';
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
import { useHeatData } from '../hooks/useHeatData';
import { useAqhiData } from '../hooks/useAqhiData';
import { useIdwOverlayImage } from '../hooks/useIdwOverlayImage';
import { useAqhiForecastTiles } from '../hooks/useAqhiForecastTiles';
import { idwInterpolate, valueToColor } from '../utils/idw';
import { valueToAqhiColor } from '../utils/aqhiUtils';
import MapLayerPicker, { MapLayer } from '../components/MapLayerPicker';
import DualStatPin from '../components/DualStatPin';
import { usePraiseAqhiTile } from '../hooks/usePraiseAqhiTile';
import { isPraiseConfigured } from '../config/praiseConfig';
import AqhiLegend from '../components/AqhiLegend';
import { fetchPraisePointData, toHkTimestamp } from '../services/praiseApi';
import { useMapSettings } from '../hooks/useMapSettings';

const FORECAST_FRAME_INTERVAL_MS = 700;
const BOTTOM_ROW_HEIGHT = 58; // approx height of the opacity-bar/locate-button row, used to space things above it

const FALLBACK_LAT = 22.3375;
const FALLBACK_LNG = 114.263;

type SelectedPoint = {
  latitude: number;
  longitude: number;
  temperature: number;
  aqhi: number;
};

type Coordinates = {
  latitude: number;
  longitude: number;
};

type Props = {
  overrideCenter?: Coordinates;
  showModeToggle?: boolean;
  enableForecastPlayback?: boolean;
  fullscreen?: boolean;
};

const MapScreen = ({
  overrideCenter,
  showModeToggle = true,
  enableForecastPlayback = false,
  fullscreen = false,
}: Props) => {
  const { coords } = useLocation();
  const { settings: mapSettings } = useMapSettings();
  const insets = useSafeAreaInsets();
  const [mapLayer, setMapLayer] = useState<MapLayer>('default');
  const [forecastPlaying, setForecastPlaying] = useState(false);
  const [frameIndex, setFrameIndex] = useState(0);

  // 1. SPLIT STATES: One for the slider UI, one for the actual map overlay
  const [sliderOpacity, setSliderOpacity] = useState(0.55);
  const [mapOpacity, setMapOpacity] = useState(0.55);

  const mapRef = useRef<MapView>(null);

  const center = overrideCenter ??
    coords ?? { latitude: FALLBACK_LAT, longitude: FALLBACK_LNG };
  const { points: heatPoints } = useHeatData(center);
  const { points: aqhiPoints } = useAqhiData(center);

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

  const weightedHeatPoints = heatPoints.map(p => ({
    latitude: p.latitude,
    longitude: p.longitude,
    value: p.temperature,
  }));
  const weightedAqhiPoints = aqhiPoints.map(p => ({
    latitude: p.latitude,
    longitude: p.longitude,
    value: p.aqhi,
  }));

  const heatOverlayUri = useIdwOverlayImage(
    weightedHeatPoints,
    region,
    valueToColor,
  );
  const aqhiOverlayUri = useIdwOverlayImage(
    weightedAqhiPoints,
    region,
    valueToAqhiColor,
  );

  const { tile: praiseAqhiTile } = usePraiseAqhiTile(
    region,
    mapLayer === 'aqhi' && isPraiseConfigured() && !forecastPlaying,
  );

  // Fetches (and fully pre-caches) forecast frames as soon as the AQHI layer
  // is up, well before the user taps Play — so playback starts instantly
  // instead of stalling on network fetches for the first loop.
  const { frames: forecastFrames, loading: forecastLoading } =
    useAqhiForecastTiles(
      region,
      enableForecastPlayback && mapLayer === 'aqhi' && isPraiseConfigured(),
    );
  const forecastReady = !forecastLoading && forecastFrames.length > 0;

  // Resets to the first frame whenever a fresh batch comes in (e.g. after panning)
  useEffect(() => {
    setFrameIndex(0);
  }, [forecastFrames]);

  useEffect(() => {
    if (!forecastPlaying || forecastFrames.length === 0) return;
    const interval = setInterval(() => {
      setFrameIndex(prev => (prev + 1) % forecastFrames.length);
    }, FORECAST_FRAME_INTERVAL_MS);
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
    const temperature = Math.round(
      idwInterpolate(latitude, longitude, weightedHeatPoints),
    );
    const aqhi = Math.round(
      idwInterpolate(latitude, longitude, weightedAqhiPoints, 2, 1),
    );
    setSelectedPoint({ latitude, longitude, temperature, aqhi });
  };

  const handleMapPress = (event: MapPressEvent) => {
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
    if (
      weightedHeatPoints.length > 0 &&
      weightedAqhiPoints.length > 0 &&
      !selectedPoint
    ) {
      placeMarkerAt(center.latitude, center.longitude);
    }
  }, [
    center.latitude,
    center.longitude,
    weightedHeatPoints.length,
    weightedAqhiPoints.length,
  ]);

  const recenter = () => {
    placeMarkerAt(center.latitude, center.longitude);
    mapRef.current?.animateToRegion({
      latitude: center.latitude,
      longitude: center.longitude,
      latitudeDelta: 0.03,
      longitudeDelta: 0.03,
    });
  };

  const showRealAqhiTile =
    mapLayer === 'aqhi' &&
    isPraiseConfigured() &&
    !!praiseAqhiTile &&
    !activeFrame;
  const showFallbackAqhiOverlay =
    mapLayer === 'aqhi' &&
    !showRealAqhiTile &&
    !activeFrame &&
    !!aqhiOverlayUri;

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        mapType={mapSettings.mapType}
        showsBuildings={mapSettings.show3DBuildings}
        pitchEnabled={mapSettings.show3DBuildings}
        style={StyleSheet.absoluteFill}
        initialRegion={initialRegion}
        onRegionChangeComplete={setRegion}
        onPress={handleMapPress}
        onPoiClick={handlePoiClick}
        showsUserLocation={!overrideCenter}
        showsMyLocationButton={false}
      >
        {mapLayer === 'heat' && heatOverlayUri && (
          <Overlay
            image={{ uri: heatOverlayUri }}
            bounds={overlayBounds}
            opacity={0.45}
          />
        )}

        {showRealAqhiTile && (
          <Overlay
            // 2. FORCE REMOUNT: Use mapOpacity as the key so it only rebuilds when sliding finishes
            key={`aqhi-real-${mapOpacity}`}
            image={{ uri: praiseAqhiTile!.uri }}
            bounds={praiseAqhiTile!.bounds}
            opacity={mapOpacity}
          />
        )}

        {showFallbackAqhiOverlay && (
          <Overlay
            key={`aqhi-fallback-${mapOpacity}`}
            image={{ uri: aqhiOverlayUri! }}
            bounds={overlayBounds}
            opacity={mapOpacity}
          />
        )}

        {mapLayer === 'aqhi' && activeFrame && (
          <Overlay
            key={`aqhi-forecast-${activeFrame.ts}`}
            image={{ uri: activeFrame.uri }}
            bounds={activeFrame.bounds}
            opacity={mapOpacity}
          />
        )}

        {selectedPoint && (
          <Marker
            key={`marker-${selectedPoint.latitude.toFixed(
              4,
            )}-${selectedPoint.longitude.toFixed(4)}`}
            coordinate={{
              latitude: selectedPoint.latitude,
              longitude: selectedPoint.longitude,
            }}
            anchor={{ x: 0.5, y: 1 }}
            zIndex={3}
            tracksViewChanges={true}
          >
            <DualStatPin
              temperature={selectedPoint.temperature}
              aqhi={selectedPoint.aqhi}
            />
          </Marker>
        )}
      </MapView>

      {mapLayer === 'aqhi' && (
        <>
          <View
            style={[
              styles.legendContainerRight,
              fullscreen && {
                top: insets.top + 16 + 54 + 12,
                bottom: insets.bottom + 16 + BOTTOM_ROW_HEIGHT + 16,
              },
            ]}
          >
            <AqhiLegend />
          </View>

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
                Layer opacity: {Math.round(sliderOpacity * 100)}%
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
                styles.locateButtonInRow,
                fullscreen && styles.locateButtonLarge,
              ]}
              onPress={recenter}
            >
              <Navigation
                size={fullscreen ? 24 : 20}
                color="#FFFFFF"
                fill="#FFFFFF"
              />
            </TouchableOpacity>
          </View>

          {enableForecastPlayback && isPraiseConfigured() && (
            <TouchableOpacity
              style={[
                styles.playForecastButton,
                !forecastReady && styles.playForecastButtonDisabled,
                fullscreen
                  ? {
                      bottom: insets.bottom + 16 + BOTTOM_ROW_HEIGHT + 16,
                      paddingVertical: 14,
                      paddingHorizontal: 22,
                    }
                  : { bottom: 64 },
              ]}
              onPress={toggleForecastPlayback}
              disabled={!forecastReady}
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
                  ? 'Loading forecast…'
                  : forecastPlaying
                  ? activeFrame
                    ? `+${activeFrame.hourOffset}h`
                    : 'Stop'
                  : 'Play Forecast'}
              </Text>
            </TouchableOpacity>
          )}
        </>
      )}

      {showModeToggle && (
        <View style={[styles.topBar, fullscreen && { top: insets.top + 16 }]}>
          <MapLayerPicker
            layer={mapLayer}
            onChange={setMapLayer}
            large={fullscreen}
          />
        </View>
      )}

      {mapLayer !== 'aqhi' && (
        <TouchableOpacity
          style={[
            styles.locateButton,
            fullscreen && [
              styles.locateButtonLarge,
              { bottom: insets.bottom + 16 },
            ],
          ]}
          onPress={recenter}
        >
          <Navigation
            size={fullscreen ? 24 : 20}
            color="#FFFFFF"
            fill="#FFFFFF"
          />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, borderRadius: 16, overflow: 'hidden' },
  topBar: { position: 'absolute', top: 16, right: 16 },
  locateButton: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#2B7A9E',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
  },
  locateButtonInRow: {
    position: 'relative',
    bottom: 0,
    right: 0,
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
  bottomRow: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
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
    position: 'absolute',
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
