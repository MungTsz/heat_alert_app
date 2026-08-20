// src/components/BookmarkMapModal.tsx
import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { X } from 'lucide-react-native';
import MapScreen from '../screens/MapScreen';
import { BookmarkEntry } from '../types/bookmark';

type Props = {
  visible: boolean;
  bookmark: BookmarkEntry | null;
  onClose: () => void;
};

const BookmarkMapModal: React.FC<Props> = ({ visible, bookmark, onClose }) => {
  if (!bookmark) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.backdropTapArea}
          activeOpacity={1}
          onPress={onClose}
        />

        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title} numberOfLines={1}>
              {bookmark.label}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <X size={22} color="#333" />
            </TouchableOpacity>
          </View>

          <View style={styles.mapContainer}>
            <MapScreen
              overrideCenter={{
                latitude: bookmark.latitude,
                longitude: bookmark.longitude,
              }}
              showModeToggle={false}
            />
          </View>

          <Text style={styles.address} numberOfLines={2}>
            {bookmark.address}
          </Text>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  backdropTapArea: { flex: 1 },
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
  mapContainer: { height: 400, borderRadius: 14, overflow: 'hidden' },
  address: { fontSize: 13, color: '#888', marginTop: 12 },
});

export default BookmarkMapModal;
