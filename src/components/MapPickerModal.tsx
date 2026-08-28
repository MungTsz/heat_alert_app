// src/components/MapPickerModal.tsx
import React, { useState } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MapView, { Region } from 'react-native-maps';
import { MapPin } from 'lucide-react-native';
import { geocodeAddress } from '../utils/geocode'; // reused for reverse lookup — see note below

type Props = {
  visible: boolean;
  initialRegion: Region;
  onConfirm: (lat: number, lng: number, address: string) => void;
  onCancel: () => void;
};

const MapPickerModal: React.FC<Props> = ({
  visible,
  initialRegion,
  onConfirm,
  onCancel,
}) => {
  const [region, setRegion] = useState<Region>(initialRegion);

  const handleConfirm = () => {
    // Fixed-center-pin pattern: the pin never moves, the map moves under it —
    // so region.latitude/longitude IS the selected point.
    onConfirm(
      region.latitude,
      region.longitude,
      `${region.latitude.toFixed(5)}, ${region.longitude.toFixed(5)}`,
    );
  };

  return (
    <Modal visible={visible} animationType="slide">
      <View style={styles.container}>
        <MapView
          style={StyleSheet.absoluteFill}
          initialRegion={initialRegion}
          onRegionChangeComplete={setRegion}
        />
        <View style={styles.centerPinWrapper} pointerEvents="none">
          <MapPin size={40} color="#D9534F" fill="#D9534F" />
        </View>

        <View style={styles.bottomBar}>
          <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.confirmButton}
            onPress={handleConfirm}
          >
            <Text style={styles.confirmText}>Use this location</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  centerPinWrapper: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -20,
    marginTop: -40, // tip of the pin sits exactly at screen center
  },
  bottomBar: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    right: 20,
    flexDirection: 'row',
    gap: 10,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    elevation: 3,
  },
  cancelText: { fontWeight: '600', color: '#666' },
  confirmButton: {
    flex: 2,
    backgroundColor: '#D9534F',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    elevation: 3,
  },
  confirmText: { fontWeight: '700', color: '#fff' },
});

export default MapPickerModal;
