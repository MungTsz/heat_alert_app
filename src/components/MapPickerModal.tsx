// src/components/MapPickerModal.tsx
import React, { useRef, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import MapView, { PROVIDER_GOOGLE, Region } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MapPin, Search, X } from 'lucide-react-native';
import { useDebouncedAddressSuggestions } from '../hooks/useDebouncedAddressSuggestions';
import { GeocodeResult } from '../utils/geocode';

type Props = {
  visible: boolean;
  initialRegion: Region;
  onConfirm: (lat: number, lng: number, address: string) => void;
  onCancel: () => void;
};

// Tighter than a typical initial region so a searched result lands close-in,
// minimizing how much the user still has to pan/zoom to place the pin exactly.
const SEARCH_RESULT_DELTA = 0.01;

const MapPickerModal: React.FC<Props> = ({
  visible,
  initialRegion,
  onConfirm,
  onCancel,
}) => {
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);
  const [region, setRegion] = useState<Region>(initialRegion);
  const [query, setQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const { suggestions, loading } = useDebouncedAddressSuggestions(query);

  const handleConfirm = () => {
    // Fixed-center-pin pattern: the pin never moves, the map moves under it —
    // so region.latitude/longitude IS the selected point.
    onConfirm(
      region.latitude,
      region.longitude,
      `${region.latitude.toFixed(5)}, ${region.longitude.toFixed(5)}`,
    );
  };

  const handleQueryChange = (text: string) => {
    setQuery(text);
    setShowSuggestions(true);
  };

  const handleClearQuery = () => {
    setQuery('');
    setShowSuggestions(false);
  };

  const handleSelectSuggestion = (result: GeocodeResult) => {
    const nextRegion: Region = {
      latitude: result.latitude,
      longitude: result.longitude,
      latitudeDelta: SEARCH_RESULT_DELTA,
      longitudeDelta: SEARCH_RESULT_DELTA,
    };
    mapRef.current?.animateToRegion(nextRegion, 400);
    setRegion(nextRegion);
    setQuery(result.displayName);
    setShowSuggestions(false);
    Keyboard.dismiss();
  };

  return (
    <Modal visible={visible} animationType="slide">
      <View style={styles.container}>
        <MapView
          ref={mapRef}
          provider={PROVIDER_GOOGLE}
          mapType="standard"
          userInterfaceStyle="light"
          style={StyleSheet.absoluteFill}
          initialRegion={initialRegion}
          onRegionChangeComplete={setRegion}
        />
        <View style={styles.centerPinWrapper} pointerEvents="none">
          <MapPin size={40} color="#D9534F" fill="#D9534F" />
        </View>

        {/* Search narrows down where to look before fine-tuning the pin by hand */}
        <View style={[styles.searchWrapper, { top: insets.top + 12 }]}>
          <View style={styles.searchBar}>
            <Search size={18} color="#999" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search for a place"
              value={query}
              onChangeText={handleQueryChange}
              onFocus={() => setShowSuggestions(true)}
              returnKeyType="search"
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={handleClearQuery} hitSlop={8}>
                <X size={16} color="#999" />
              </TouchableOpacity>
            )}
          </View>

          {showSuggestions && query.trim().length >= 3 && (
            <View style={styles.suggestionBox}>
              {loading ? (
                <View style={styles.suggestionLoading}>
                  <ActivityIndicator size="small" color="#888" />
                </View>
              ) : suggestions.length > 0 ? (
                <FlatList
                  data={suggestions}
                  keyExtractor={(item, i) =>
                    `${item.latitude}-${item.longitude}-${i}`
                  }
                  keyboardShouldPersistTaps="handled"
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.suggestionItem}
                      onPress={() => handleSelectSuggestion(item)}
                    >
                      <Text style={styles.suggestionText} numberOfLines={2}>
                        {item.displayName}
                      </Text>
                    </TouchableOpacity>
                  )}
                  style={styles.suggestionList}
                />
              ) : (
                <Text style={styles.noResultsText}>No matches found</Text>
              )}
            </View>
          )}
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
  searchWrapper: {
    position: 'absolute',
    left: 16,
    right: 16,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  searchInput: { flex: 1, fontSize: 15, color: '#222', padding: 0 },
  suggestionBox: {
    marginTop: 6,
    backgroundColor: '#fff',
    borderRadius: 12,
    maxHeight: 220,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  suggestionList: { maxHeight: 220 },
  suggestionItem: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  suggestionText: { fontSize: 13, color: '#333' },
  suggestionLoading: { paddingVertical: 14, alignItems: 'center' },
  noResultsText: {
    paddingVertical: 14,
    paddingHorizontal: 14,
    fontSize: 13,
    color: '#999',
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
