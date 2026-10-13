// src/components/addPlace/InfoNote.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Info } from 'lucide-react-native';

type Props = { children: string };

// The light-blue "ⓘ why this matters" note used in the place sheets.
const InfoNote: React.FC<Props> = ({ children }) => (
  <View style={styles.box}>
    <Info size={16} color="#3B6FB6" />
    <Text style={styles.text}>{children}</Text>
  </View>
);

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#EEF4FC',
  },
  text: { flex: 1, fontSize: 13, lineHeight: 18, color: '#2D4F80' },
});

export default InfoNote;
