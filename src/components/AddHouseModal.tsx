import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
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
  const [label, setLabel] = useState('');
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    setLabel('');
    setAddress('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.sheet}>
          <Text style={styles.title}>Add House to Monitor</Text>

          <TextInput
            style={styles.input}
            placeholder="Name (e.g. Mom's House)"
            value={label}
            onChangeText={setLabel}
          />
          <TextInput
            style={styles.input}
            placeholder="Address"
            value={address}
            onChangeText={setAddress}
          />

          {error && <Text style={styles.error}>{error}</Text>}

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onClose}
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
        </View>
      </KeyboardAvoidingView>
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
