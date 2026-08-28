// src/screens/MapScreen.tsx
import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import MapView, {
  Marker,
  Overlay,
  PROVIDER_GOOGLE,
  Region,
  MapPressEvent,
} from 'react-native-maps';
import { Navigation } from 'lucide-react-native';
import Slider from '@react-native-community/slider';
import { useLocation } from '../utils/useLocation';
import { useHeatData } from '../hooks/useHeatData';
import { useAqhiData } from '../hooks/useAqhiData';
import { useIdwOverlayImage } from '../hooks/useIdwOverlayImage';
import { idwInterpolate, valueToColor } from '../utils/idw';
import { valueToAqhiColor } from '../utils/aqhiUtils';
import MapLayerPicker, { MapLayer } from '../components/MapLayerPicker';
import DualStatPin from '../components/DualStatPin';
import { usePraiseAqhiTile } from '../hooks/usePraiseAqhiTile';
import { isPraiseConfigured } from '../config/praiseConfig';
import AqhiLegend from '../components/AqhiLegend';
import { fetchPraisePointData, toHkTimestamp } from '../services/praiseApi';
import { useMapSettings } from '../hooks/useMapSettings';

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
};

const MapScreen = ({ overrideCenter, showModeToggle = true }: Props) => {
  const { coords } = useLocation();
  const { settings: mapSettings } = useMapSettings();
  const [mapLayer, setMapLayer] = useState<MapLayer>('default');
  const [aqhiOpacity, setAqhiOpacity] = useState(0.55);
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
    mapLayer === 'aqhi' && isPraiseConfigured(),
  );

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
    mapLayer === 'aqhi' && isPraiseConfigured() && !!praiseAqhiTile;
  const showFallbackAqhiOverlay =
    mapLayer === 'aqhi' && !showRealAqhiTile && !!aqhiOverlayUri;
  // Rounded to whole percent so the key only changes (and remounts the native
  // overlay) on a meaningful step, not on every sub-pixel slider movement.
  const opacityKeyStep = Math.round(aqhiOpacity * 20);

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
            key={`aqhi-real-${opacityKeyStep}`}
            image={{ uri: praiseAqhiTile!.uri }}
            bounds={praiseAqhiTile!.bounds}
            opacity={aqhiOpacity}
          />
        )}

        {showFallbackAqhiOverlay && (
          <Overlay
            key={`aqhi-fallback-${opacityKeyStep}`}
            image={{ uri: aqhiOverlayUri! }}
            bounds={overlayBounds}
            opacity={aqhiOpacity}
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
          <View style={styles.legendContainerRight}>
            <AqhiLegend />
          </View>

          <View style={styles.opacityControlFullWidth}>
            <Text style={styles.opacityLabel}>
              Layer opacity: {Math.round(aqhiOpacity * 100)}%
            </Text>
            <Slider
              style={styles.opacitySliderFull}
              minimumValue={0.1}
              maximumValue={0.9}
              value={aqhiOpacity}
              onValueChange={setAqhiOpacity}
              minimumTrackTintColor="#D9534F"
              maximumTrackTintColor="#ccc"
            />
          </View>
        </>
      )}

      {showModeToggle && (
        <View style={styles.topBar}>
          <MapLayerPicker layer={mapLayer} onChange={setMapLayer} />
        </View>
      )}

      <TouchableOpacity style={styles.locateButton} onPress={recenter}>
        <Navigation size={20} color="#FFFFFF" fill="#FFFFFF" />
      </TouchableOpacity>
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
  legendContainerRight: {
    position: 'absolute',
    top: 60,
    right: 8,
    bottom: 70,
  },
  opacityControlFullWidth: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    right: 8,
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
  opacitySliderFull: {
    width: '100%',
    height: 34,
  },
});

export default MapScreen;
