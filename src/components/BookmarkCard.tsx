import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Trash2, Home, MapPin } from 'lucide-react-native';
import { getHeatIndexInfo } from '../utils/heatIndexUtils';
import { getAqhiInfo } from '../utils/aqhiUtils';
import { BookmarkType } from '../types/bookmark';

type Props = {
  label: string;
  type: BookmarkType;
  temperature: number;
  aqhi: number;
  distance: number;
  onPress: () => void;
  onRemove: () => void;
};

const BookmarkCard = ({
  label,
  type,
  temperature,
  aqhi,
  distance,
  onPress,
  onRemove,
}: Props) => {
  const heatInfo = getHeatIndexInfo(temperature);
  const aqhiInfo = getAqhiInfo(aqhi);
  const Icon = type === 'house' ? Home : MapPin;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.topRow}>
        <View style={styles.labelRow}>
          <Icon size={16} color="#555" />
          <Text style={styles.label} numberOfLines={1}>
            {label}
          </Text>
        </View>
        <TouchableOpacity
          onPress={onRemove}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Trash2 size={16} color="#999" />
        </TouchableOpacity>
      </View>

      <Text style={styles.distance}>{distance.toFixed(1)} miles away</Text>

      <View style={styles.badgeRow}>
        <View style={[styles.badge, { backgroundColor: heatInfo.color }]}>
          <Text style={styles.badgeLabel}>Heat</Text>
          <Text style={styles.badgeValue}>
            {temperature}° {heatInfo.classification}
          </Text>
        </View>
        <View style={[styles.badge, { backgroundColor: aqhiInfo.color }]}>
          <Text style={styles.badgeLabel}>AQHI</Text>
          <Text style={styles.badgeValue}>
            {aqhi} {aqhiInfo.classification}
          </Text>
        </View>
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
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: '#222',
    flexShrink: 1,
  },
  distance: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
    marginBottom: 10,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  badge: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  badgeLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#333',
  },
  badgeValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1A1A1A',
    marginTop: 2,
  },
});

export default BookmarkCard;
