// src/components/HouseMapModal.tsx
import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { X } from 'lucide-react-native';
import MapScreen from '../screens/MapScreen';
import { HouseEntry } from '../types/house';

type Props = {
  visible: boolean;
  house: HouseEntry | null;
  onClose: () => void;
};

const HouseMapModal: React.FC<Props> = ({ visible, house, onClose }) => {
  if (!house) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        {/* This is a plain sibling above the sheet, sized by flex:1 to fill
            only the empty space ABOVE the sheet. It never overlaps the map's
            bounding box, so a pinch gesture on the map can never touch it —
            no propagation tricks needed. */}
        <TouchableOpacity
          style={styles.backdropTapArea}
          activeOpacity={1}
          onPress={onClose}
        />

        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title} numberOfLines={1}>
              {house.label}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={22} color="#333" />
            </TouchableOpacity>
          </View>

          <View style={styles.mapContainer}>
            <MapScreen
              overrideCenter={{
                latitude: house.latitude,
                longitude: house.longitude,
              }}
              showModeToggle={false}
            />
          </View>

          <Text style={styles.address} numberOfLines={2}>
            {house.address}
          </Text>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  backdropTapArea: {
    flex: 1, // fills exactly the space above the sheet, nothing more
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 30,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#222',
    flex: 1,
    marginRight: 10,
  },
  closeButton: {
    padding: 4,
  },
  mapContainer: {
    height: 400,
    borderRadius: 14,
    overflow: 'hidden',
  },
  address: {
    fontSize: 13,
    color: '#888',
    marginTop: 12,
  },
});

export default HouseMapModal;
