// src/components/RenamePlaceModal.tsx
import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { validatePlaceName } from '../utils/placeNaming';

type Props = {
  visible: boolean;
  initialName: string;
  // Every OTHER place's name — the place's own current name is allowed.
  otherNames: readonly string[];
  onSave: (name: string) => void;
  onCancel: () => void;
};

// A small dialog instead of Alert.prompt, which only exists on iOS.
const RenamePlaceModal: React.FC<Props> = ({
  visible,
  initialName,
  otherNames,
  onSave,
  onCancel,
}) => {
  const [name, setName] = useState(initialName);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setName(initialName);
      setError(null);
    }
  }, [visible, initialName]);

  const handleSave = () => {
    const validationError = validatePlaceName(name, otherNames);
    if (validationError) {
      setError(validationError);
      return;
    }
    onSave(name.trim());
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.dialog}>
          <Text style={styles.title}>Rename place</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={text => {
              setName(text);
              setError(null);
            }}
            autoFocus
            selectTextOnFocus
            returnKeyType="done"
            onSubmitEditing={handleSave}
          />
          {error && <Text style={styles.error}>{error}</Text>}
          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
              <Text style={styles.saveText}>Save</Text>
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
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  dialog: { backgroundColor: '#fff', borderRadius: 16, padding: 20 },
  title: { fontSize: 17, fontWeight: 'bold', color: '#222', marginBottom: 12 },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
  },
  error: { color: '#D9534F', fontSize: 13, marginTop: 6 },
  buttonRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 16 },
  cancelButton: { paddingVertical: 10, paddingHorizontal: 16 },
  cancelText: { color: '#888', fontWeight: '600' },
  saveButton: {
    backgroundColor: '#D9534F',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 22,
  },
  saveText: { color: '#fff', fontWeight: '600' },
});

export default RenamePlaceModal;
