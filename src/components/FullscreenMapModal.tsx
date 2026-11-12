// src/components/FullscreenMapModal.tsx
import React from 'react';
import { Modal, View, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft } from 'lucide-react-native';
import MapScreen from '../screens/MapScreen';
import { MapLayer } from '../types/mapSettings';
import { MapPlacePin } from '../hooks/useMapPlacePins';

type Coordinates = {
  latitude: number;
  longitude: number;
};

type Props = {
  visible: boolean;
  center?: Coordinates;
  // Owned by the screen behind it, so closing the full-screen map leaves
  // its preview on the layer the user last picked.
  layer: MapLayer;
  onLayerChange: (layer: MapLayer) => void;
  places?: MapPlacePin[];
  onPlacePress?: (placeId: string) => void;
  onClose: () => void;
};

const FullscreenMapModal: React.FC<Props> = ({
  visible,
  center,
  layer,
  onLayerChange,
  places,
  onPlacePress,
  onClose,
}) => {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <MapScreen
          layer={layer}
          onLayerChange={onLayerChange}
          overrideCenter={center}
          enableForecastPlayback
          fullscreen
          places={places}
          onPlacePress={onPlacePress}
        />

        <TouchableOpacity
          style={[styles.backButton, { top: insets.top + 16 }]}
          onPress={onClose}
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
