// src/components/BookmarkMapModal.tsx
import React, { useRef } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { X } from 'lucide-react-native';
import MapScreen, { MapScreenHandle } from '../screens/MapScreen';
import { BookmarkEntry } from '../types/bookmark';
import { useDefaultMapLayer } from '../hooks/useDefaultMapLayer';
import { MAP_LAYER_COPY } from '../config/alertCopy';

type Props = {
  visible: boolean;
  bookmark: BookmarkEntry | null;
  onClose: () => void;
};

const BookmarkMapModal: React.FC<Props> = ({ visible, bookmark, onClose }) => {
  // Like every map: opens on the Environmental Index, with heat index and
  // AQHI a pick away, and back on the index each time it is opened. Called
  // before the early return below (rules of hooks).
  const [layer, setLayer] = useDefaultMapLayer(visible && bookmark !== null);
  const mapRef = useRef<MapScreenHandle>(null);

  if (!bookmark) return null;

  // Android back: the map's own open panel first, then this sheet.
  const handleRequestClose = () => {
    if (mapRef.current?.handleBack()) return;
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleRequestClose}
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
            <TouchableOpacity
              onPress={onClose}
              hitSlop={11}
              accessibilityRole="button"
              accessibilityLabel={MAP_LAYER_COPY.closeMapLabel}
            >
              <X size={22} color="#333" />
            </TouchableOpacity>
          </View>

          <View style={styles.mapContainer}>
            <MapScreen
              ref={mapRef}
              layer={layer}
              onLayerChange={setLayer}
              overrideCenter={{
                latitude: bookmark.latitude,
                longitude: bookmark.longitude,
              }}
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
