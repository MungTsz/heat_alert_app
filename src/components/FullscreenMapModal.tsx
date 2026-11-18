// src/components/FullscreenMapModal.tsx
import React, { useRef } from 'react';
import { Modal, View, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft } from 'lucide-react-native';
import MapScreen, { MapScreenHandle } from '../screens/MapScreen';
import { MapPlacePin } from '../hooks/useMapPlacePins';
import { useDefaultMapLayer } from '../hooks/useDefaultMapLayer';
import { MAP_LAYER_COPY } from '../config/alertCopy';

type Coordinates = {
  latitude: number;
  longitude: number;
};

type Props = {
  visible: boolean;
  center?: Coordinates;
  places?: MapPlacePin[];
  onPlacePress?: (placeId: string) => void;
  onClose: () => void;
};

const FullscreenMapModal: React.FC<Props> = ({
  visible,
  center,
  places,
  onPlacePress,
  onClose,
}) => {
  const insets = useSafeAreaInsets();
  // Its own layer, back on the Environmental Index every time it opens
  // (the preview behind it is always on the index).
  const [layer, setLayer] = useDefaultMapLayer(visible);
  const mapRef = useRef<MapScreenHandle>(null);

  // Android back: the map's own open panel first, then the map.
  const handleRequestClose = () => {
    if (mapRef.current?.handleBack()) return;
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleRequestClose}>
      <View style={styles.container}>
        <MapScreen
          ref={mapRef}
          layer={layer}
          onLayerChange={setLayer}
          overrideCenter={center}
          enableForecastPlayback
          fullscreen
          places={places}
          onPlacePress={onPlacePress}
        />

        <TouchableOpacity
          style={[styles.backButton, { top: insets.top + 16 }]}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={MAP_LAYER_COPY.closeMapLabel}
        >
          <ArrowLeft size={26} color="#333" />
        </TouchableOpacity>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  backButton: {
    position: 'absolute',
    left: 16,
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
  },
});

export default FullscreenMapModal;
