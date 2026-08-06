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
import { useLocation } from '../utils/useLocation';
import { useHeatData } from '../hooks/useHeatData';
import { useIdwOverlayImage } from '../hooks/useIdwOverlayImage';
import { idwInterpolate, valueToPinColor } from '../utils/idw';
import MapModeToggle from '../components/MapModeToggle';
import HeatPin from '../components/HeatPin';
import { Navigation } from 'lucide-react-native';

const FALLBACK_LAT = 22.3375;
const FALLBACK_LNG = 114.263;

type SelectedPoint = {
  latitude: number;
  longitude: number;
  temperature: number;
};

type Coordinates = {
  latitude: number;
  longitude: number;
};

type Props = {
  // When provided, the map centers on this fixed point instead of the
  // device's live GPS location — used by HouseMapModal to show a specific
  // monitored address. The 📍 recenter button still returns to this point.
  overrideCenter?: Coordinates;
  // Hides the mode toggle for the compact popup use-case (optional)
  showModeToggle?: boolean;
};

const MapScreen = ({ overrideCenter, showModeToggle = true }: Props) => {
  const { coords } = useLocation();
  const [isSpatial, setIsSpatial] = useState<boolean>(true);
  const mapRef = useRef<MapView>(null);

  // Priority: explicit override > live GPS > fallback constant
  const center = overrideCenter ??
    coords ?? { latitude: FALLBACK_LAT, longitude: FALLBACK_LNG };
  const { points, loading } = useHeatData(center);

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

  const weightedPoints = points.map(p => ({
    latitude: p.latitude,
    longitude: p.longitude,
    value: p.temperature,
  }));

  const overlayImageUri = useIdwOverlayImage(weightedPoints, region);

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
      idwInterpolate(latitude, longitude, weightedPoints),
    );
    setSelectedPoint({ latitude, longitude, temperature });
  };

  const handleMapPress = (event: MapPressEvent) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    placeMarkerAt(latitude, longitude);
  };

  const handlePoiClick = (event: any) => {
    const { coordinate } = event.nativeEvent;
    placeMarkerAt(coordinate.latitude, coordinate.longitude);
  };

  // Show a marker at the center point as soon as heat data is ready
  useEffect(() => {
    if (weightedPoints.length > 0 && !selectedPoint) {
      placeMarkerAt(center.latitude, center.longitude);
    }
  }, [center.latitude, center.longitude, weightedPoints.length]);

  // 📍 button -> jump back to the relevant center (override point, or live GPS)
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
        showsUserLocation={!overrideCenter} // only show the blue GPS dot on the main map
        showsMyLocationButton={false}
      >
        {isSpatial && overlayImageUri && (
          <Overlay
            image={{ uri: overlayImageUri }}
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
            <HeatPin
              temperature={selectedPoint.temperature}
              color={valueToPinColor(selectedPoint.temperature)}
            />
          </Marker>
        )}
      </MapView>

      {showModeToggle && (
        <View style={styles.topBar}>
          <MapModeToggle isSpatial={isSpatial} onToggle={setIsSpatial} />
        </View>
      )}

      <TouchableOpacity style={styles.locateButton} onPress={recenter}>
        <Navigation size={20} color="#2B7A9E" fill="#2B7A9E" />
      </TouchableOpacity>

      {loading && (
        <View style={styles.loadingBadge}>
          <Text style={styles.loadingText}>Loading heat data...</Text>
        </View>
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
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
  },
  locateIcon: { fontSize: 20 },
  loadingBadge: {
    position: 'absolute',
    bottom: 30,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  loadingText: { color: '#fff', fontSize: 13 },
});

export default MapScreen;
