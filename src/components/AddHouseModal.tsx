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
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { geocodeAddress } from '../utils/geocode';

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
  const [label, setLabel] = useState('');
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const translateY = useRef(new Animated.Value(0)).current;

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
    setError(null);
    onClose();
  };

  const handleSave = async () => {
    if (!label.trim() || !address.trim()) {
      setError('Please fill in both fields.');
      return;
    }
    setLoading(true);
    setError(null);

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
      {/* Tapping the dimmed backdrop closes the modal */}
      <Pressable style={styles.overlay} onPress={resetAndClose}>
        {/* Stops taps inside the sheet from bubbling up and closing it */}
        <Pressable onPress={e => e.stopPropagation()}>
          <Animated.View
            style={[
              styles.sheet,
              {
                paddingBottom: 24 + insets.bottom,
                transform: [{ translateY }],
              },
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
            <TextInput
              style={styles.input}
              placeholder="Address"
              value={address}
              onChangeText={setAddress}
              returnKeyType="done"
              onSubmitEditing={handleSave}
            />

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
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
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
