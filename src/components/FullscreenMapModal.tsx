// src/components/FullscreenMapModal.tsx
import React from 'react';
import { Modal, View, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft } from 'lucide-react-native';
import MapScreen from '../screens/MapScreen';

type Coordinates = {
  latitude: number;
  longitude: number;
};

type Props = {
  visible: boolean;
  center?: Coordinates;
  onClose: () => void;
};

const FullscreenMapModal: React.FC<Props> = ({ visible, center, onClose }) => {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <MapScreen
          overrideCenter={center}
          enableForecastPlayback
          fullscreen
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
