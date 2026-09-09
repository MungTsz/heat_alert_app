// src/components/ImportHistoryCard.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Trash2, FileText } from 'lucide-react-native';

type Props = {
  sourceLabel: string;
  importedAt: number;
  totalExposure: number;
  onPress: () => void;
  onRemove: () => void;
};

const formatImportedAt = (ms: number): string =>
  new Date(ms).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

const ImportHistoryCard: React.FC<Props> = ({
  sourceLabel,
  importedAt,
  totalExposure,
  onPress,
  onRemove,
}) => (
  <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
    <View style={styles.topRow}>
      <View style={styles.labelRow}>
        <FileText size={16} color="#555" />
        <Text style={styles.label} numberOfLines={1}>
          {sourceLabel}
        </Text>
      </View>
      <TouchableOpacity onPress={onRemove} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Trash2 size={16} color="#999" />
      </TouchableOpacity>
    </View>
    <Text style={styles.meta}>Imported {formatImportedAt(importedAt)}</Text>
    <Text style={styles.total}>{totalExposure.toFixed(2)} %AR·h total</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: '#E2E2E2',
    padding: 14,
    marginBottom: 10,
  },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  label: { fontSize: 15, fontWeight: '600', color: '#222', flexShrink: 1 },
  meta: { fontSize: 12, color: '#888', marginTop: 4 },
  total: { fontSize: 13, fontWeight: '700', color: '#1A1A1A', marginTop: 6 },
});

export default ImportHistoryCard;
