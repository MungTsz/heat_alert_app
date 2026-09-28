// src/components/DeviceCard.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { ChevronRight, Smartphone } from 'lucide-react-native';
import { ExposureDevice } from '../types/exposure';
import { useExposureHistory } from '../hooks/useExposureHistory';
import { useImportJobStatus } from '../hooks/useImportJobStatus';

type Props = {
  device: ExposureDevice;
  onPress: () => void;
};

const DeviceCard: React.FC<Props> = ({ device, onPress }) => {
  const { history, refresh } = useExposureHistory(device.id);
  const { status: jobStatus } = useImportJobStatus(device.id, refresh);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.topRow}>
        <View style={styles.labelRow}>
          <Smartphone size={16} color="#555" />
          <Text style={styles.label} numberOfLines={1}>
            {device.name}
          </Text>
        </View>
        <ChevronRight size={16} color="#999" />
      </View>
      <View style={styles.metaRow}>
        {jobStatus && <ActivityIndicator size="small" color="#8B5CF6" />}
        <Text style={styles.meta}>
          {jobStatus
            ? `Processing ${jobStatus.completed} of ${jobStatus.total} files…`
            : history.length === 0
              ? 'No data imported yet'
              : `${history.length} day${history.length === 1 ? '' : 's'} tracked`}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

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
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  meta: { fontSize: 12, color: '#888' },
});

export default DeviceCard;
