// src/components/addPlace/PlaceNamePreview.tsx
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { Check, Pencil } from 'lucide-react-native';
import { validatePlaceName } from '../../utils/placeNaming';

type Props = {
  autoName: string | null;
  loading: boolean;
  // A name the user typed — overrides autoName until cleared.
  customName: string | null;
  existingNames: readonly string[];
  onCustomNameChange: (name: string | null) => void;
};

// "Saved as: HKUST ✎" — the default name is filled in for the user, who only
// has to touch it if they'd rather call the place something else.
const PlaceNamePreview: React.FC<Props> = ({
  autoName,
  loading,
  customName,
  existingNames,
  onCustomNameChange,
}) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);

  const shownName = customName ?? autoName;

  const startEditing = () => {
    setDraft(shownName ?? '');
    setError(null);
    setEditing(true);
  };

  const commit = () => {
    const validationError = validatePlaceName(draft, existingNames);
    if (validationError) {
      setError(validationError);
      return;
    }
    const trimmed = draft.trim();
    // Typing the suggested name back in is the same as not renaming — keep
    // following the pin so the name stays right if the user moves it again.
    onCustomNameChange(trimmed === autoName ? null : trimmed);
    setEditing(false);
  };

  if (editing) {
    return (
      <View>
        <View style={styles.row}>
          <TextInput
            style={styles.input}
            value={draft}
            onChangeText={text => {
              setDraft(text);
              setError(null);
            }}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={commit}
          />
          <TouchableOpacity onPress={commit} hitSlop={8} accessibilityLabel="Done renaming">
            <Check size={22} color="#2E7D32" />
          </TouchableOpacity>
        </View>
        {error && <Text style={styles.error}>{error}</Text>}
      </View>
    );
  }

  return (
    <View style={styles.row}>
      <Text style={styles.caption}>Saved as</Text>
      {loading && !customName ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color="#888" />
          <Text style={styles.loadingText}>Finding place name…</Text>
        </View>
      ) : (
        <>
          <Text style={styles.name} numberOfLines={1}>
            {shownName}
          </Text>
          <TouchableOpacity onPress={startEditing} hitSlop={8} accessibilityLabel="Rename">
            <Pencil size={16} color="#666" />
          </TouchableOpacity>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 32 },
  caption: { fontSize: 13, color: '#888' },
  name: { flexShrink: 1, fontSize: 16, fontWeight: '700', color: '#222' },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  loadingText: { fontSize: 13, color: '#888' },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 15,
  },
  error: { color: '#D9534F', fontSize: 12, marginTop: 4 },
});

export default PlaceNamePreview;
