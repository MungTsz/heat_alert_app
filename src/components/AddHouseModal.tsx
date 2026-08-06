// src/components/AddHouseModal.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Keyboard,
  Animated,
  Platform,
  Easing,
  KeyboardEvent,
  FlatList,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GeocodeResult } from '../utils/geocode';
import { useDebouncedAddressSuggestions } from '../hooks/useDebouncedAddressSuggestions';
import { useLocation } from '../utils/useLocation';

type Props = {
  visible: boolean;
  onClose: () => void;
  onAdd: (
    label: string,
    address: string,
    latitude: number,
    longitude: number,
  ) => void;
};

const AddHouseModal = ({ visible, onClose, onAdd }: Props) => {
  const insets = useSafeAreaInsets();
  const { locationText, coords, loading: locationLoading } = useLocation();

  const [label, setLabel] = useState('');
  const [address, setAddress] = useState('');
  const [selectedCoords, setSelectedCoords] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasUserEdited, setHasUserEdited] = useState(false);

  const { suggestions, loading: suggestionsLoading } =
    useDebouncedAddressSuggestions(address);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const translateY = useRef(new Animated.Value(0)).current;

  // Prefill with the current location as soon as it's ready, but only if
  // the user hasn't already started typing their own address — so this
  // never silently overwrites something they're mid-way through entering.
  useEffect(() => {
    if (
      visible &&
      !hasUserEdited &&
      !locationLoading &&
      coords &&
      locationText &&
      locationText !== 'Locating...' &&
      locationText !== 'Unavailable' &&
      locationText !== 'Permission denied' &&
      locationText !== 'Error'
    ) {
      setAddress(locationText);
      setSelectedCoords({
        latitude: coords.latitude,
        longitude: coords.longitude,
      });
    }
  }, [visible, hasUserEdited, locationLoading, coords, locationText]);

  useEffect(() => {
    const showEvent =
      Platform.OS === 'android' ? 'keyboardDidShow' : 'keyboardWillShow';
    const hideEvent =
      Platform.OS === 'android' ? 'keyboardDidHide' : 'keyboardWillHide';

    const showSub = Keyboard.addListener(showEvent, (e: KeyboardEvent) => {
      const keyboardHeight = e.endCoordinates.height;
      const EXTRA_BUFFER = 24;
      Animated.timing(translateY, {
        toValue: -(keyboardHeight + EXTRA_BUFFER),
        duration: 220,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start();
    });

    const hideSub = Keyboard.addListener(hideEvent, () => {
      Animated.timing(translateY, {
        toValue: 0,
        duration: 200,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start();
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [translateY]);

  const resetAndClose = () => {
    Keyboard.dismiss();
    setLabel('');
    setAddress('');
    setSelectedCoords(null);
    setError(null);
    setShowSuggestions(false);
    setHasUserEdited(false); // allows prefill to run again next time the modal opens
    onClose();
  };

  const handleAddressChange = (text: string) => {
    setHasUserEdited(true);
    setAddress(text);
    setSelectedCoords(null);
    setShowSuggestions(true);
  };

  const handleSelectSuggestion = (result: GeocodeResult) => {
    setAddress(result.displayName);
    setSelectedCoords({
      latitude: result.latitude,
      longitude: result.longitude,
    });
    setShowSuggestions(false);
    Keyboard.dismiss();
  };

  const handleSave = async () => {
    if (!label.trim() || !address.trim()) {
      setError('Please fill in both fields.');
      return;
    }

    if (selectedCoords) {
      onAdd(
        label.trim(),
        address.trim(),
        selectedCoords.latitude,
        selectedCoords.longitude,
      );
      resetAndClose();
      return;
    }

    setLoading(true);
    setError(null);
    const { geocodeAddress } = await import('../utils/geocode');
    const result = await geocodeAddress(address);
    setLoading(false);

    if (!result) {
      setError('Could not find that address. Try being more specific.');
      return;
    }

    onAdd(label.trim(), result.displayName, result.latitude, result.longitude);
    resetAndClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={resetAndClose}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.backdropTapArea}
          activeOpacity={1}
          onPress={resetAndClose}
        />

        <Animated.View
          style={[
            styles.sheet,
            { paddingBottom: 24 + insets.bottom, transform: [{ translateY }] },
          ]}
        >
          <Text style={styles.title}>Add House to Monitor</Text>

          <TextInput
            style={styles.input}
            placeholder="Name (e.g. Mom's House)"
            value={label}
            onChangeText={setLabel}
            returnKeyType="next"
          />

          <View>
            <TextInput
              style={styles.input}
              placeholder="Address"
              value={address}
              onChangeText={handleAddressChange}
              onFocus={() => setShowSuggestions(true)}
              returnKeyType="done"
            />
            {!hasUserEdited && locationLoading && (
              <View style={styles.inlineLoadingHint}>
                <ActivityIndicator size="small" color="#aaa" />
              </View>
            )}
          </View>

          {showSuggestions && address.trim().length >= 3 && (
            <View style={styles.suggestionBox}>
              {suggestionsLoading ? (
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

          {error && <Text style={styles.error}>{error}</Text>}

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={resetAndClose}
              disabled={loading}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSave}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.saveText}>Save</Text>
              )}
            </TouchableOpacity>
          </View>
        </Animated.View>
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
    flex: 1,
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#222',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
    fontSize: 15,
  },
  inlineLoadingHint: {
    position: 'absolute',
    right: 14,
    top: 12,
  },
  suggestionBox: {
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 10,
    marginTop: -6,
    marginBottom: 12,
    maxHeight: 180,
    overflow: 'hidden',
    backgroundColor: '#FAFAFA',
  },
  suggestionList: {
    maxHeight: 180,
  },
  suggestionItem: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  suggestionText: {
    fontSize: 13,
    color: '#333',
  },
  suggestionLoading: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  noResultsText: {
    paddingVertical: 14,
    paddingHorizontal: 14,
    fontSize: 13,
    color: '#999',
  },
  error: {
    color: '#D9534F',
    fontSize: 13,
    marginBottom: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
    gap: 10,
  },
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 18,
  },
  cancelText: {
    color: '#888',
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#D9534F',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 22,
    minWidth: 80,
    alignItems: 'center',
  },
  saveText: {
    color: '#fff',
    fontWeight: '600',
  },
});

export default AddHouseModal;
