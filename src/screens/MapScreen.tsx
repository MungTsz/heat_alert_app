// src/screens/MapScreen.tsx
import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import MapView, {
  Marker,
  Overlay,
  PROVIDER_GOOGLE,
  Region,
  MapPressEvent,
} from 'react-native-maps';
import { Navigation } from 'lucide-react-native';
import { useLocation } from '../utils/useLocation';
import { useHeatData } from '../hooks/useHeatData';
import { useAqhiData } from '../hooks/useAqhiData';
import { useIdwOverlayImage } from '../hooks/useIdwOverlayImage';
import { idwInterpolate, valueToColor } from '../utils/idw';
import { valueToAqhiColor } from '../utils/aqhiUtils';
import MapLayerPicker, { MapLayer } from '../components/MapLayerPicker';
import DualStatPin from '../components/DualStatPin';
import { MapPin } from 'lucide-react-native';

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
  showModeToggle?: boolean; // kept for backward compatibility; hides the layer picker entirely if false
};

const MapScreen = ({ overrideCenter, showModeToggle = true }: Props) => {
  const { coords } = useLocation();
  const [mapLayer, setMapLayer] = useState<MapLayer>('default');
  const mapRef = useRef<MapView>(null);

  const center = overrideCenter ??
    coords ?? { latitude: FALLBACK_LAT, longitude: FALLBACK_LNG };
  const { points: heatPoints, loading: heatLoading } = useHeatData(center);
  const { points: aqhiPoints, loading: aqhiLoading } = useAqhiData(center);

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

  const north = region.latitude + Math.abs(region.latitudeDelta) / 2;
  const south = region.latitude - Math.abs(region.latitudeDelta) / 2;
  const east = region.longitude + Math.abs(region.longitudeDelta) / 2;
  const west = region.longitude - Math.abs(region.longitudeDelta) / 2;
  const overlayBounds: [[number, number], [number, number]] = [
    [north, east],
    [south, west],
  ];

  const placeMarkerAt = (latitude: number, longitude: number) => {
    const temperature = Math.round(
      idwInterpolate(latitude, longitude, weightedHeatPoints),
    );
    const aqhi = Math.round(
      idwInterpolate(latitude, longitude, weightedAqhiPoints),
    );
    setSelectedPoint({ latitude, longitude, temperature, aqhi });
  };

  const handleMapPress = (event: MapPressEvent) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    placeMarkerAt(latitude, longitude);
  };

  const handlePoiClick = (event: any) => {
    const { coordinate } = event.nativeEvent;
    placeMarkerAt(coordinate.latitude, coordinate.longitude);
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

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
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
        {mapLayer === 'aqhi' && aqhiOverlayUri && (
          <Overlay
            image={{ uri: aqhiOverlayUri }}
            bounds={overlayBounds}
            opacity={0.45}
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
    backgroundColor: '#2B7A9E', // solid color background, so the white icon reads clearly
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
  },
});

export default MapScreen;
