import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Trash2, Pencil } from 'lucide-react-native';
import { getHeatIndexInfo } from '../utils/heatIndexUtils';
import { getAqhiInfo } from '../utils/aqhiUtils';
import { PlaceCategory } from '../types/bookmark';
import { PLACE_CATEGORY_CONFIG } from '../config/placeCategoryConfig';
import { EXPOSURE_IO_CONFIG } from '../config/exposureIoConfig';

type Props = {
  label: string;
  category: PlaceCategory;
  radiusMeters: number;
  temperature: number;
  aqhi: number;
  distance: number;
  onPress: () => void;
  onRename: () => void;
  onRemove: () => void;
};

const ACTION_HIT_SLOP = { top: 8, bottom: 8, left: 8, right: 8 };

const BookmarkCard = ({
  label,
  category,
  radiusMeters,
  temperature,
  aqhi,
  distance,
  onPress,
  onRename,
  onRemove,
}: Props) => {
  const heatInfo = getHeatIndexInfo(temperature);
  const aqhiInfo = getAqhiInfo(aqhi);
  const { Icon } = PLACE_CATEGORY_CONFIG[category];

  const handleRemovePress = () => {
    Alert.alert('Delete Bookmark', `Remove "${label}" from your bookmarks?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: onRemove },
    ]);
  };

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.topRow}>
        <View style={styles.labelRow}>
          <Icon size={16} color={EXPOSURE_IO_CONFIG[category].color} />
          <Text style={styles.label} numberOfLines={1}>
            {label}
          </Text>
        </View>
        <View style={styles.actionRow}>
          <TouchableOpacity onPress={onRename} hitSlop={ACTION_HIT_SLOP} accessibilityLabel="Rename">
            <Pencil size={16} color="#999" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleRemovePress}
            hitSlop={ACTION_HIT_SLOP}
            accessibilityLabel="Delete"
          >
            <Trash2 size={16} color="#999" />
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.distance}>
        {distance.toFixed(1)} miles away · {radiusMeters} m area
      </Text>

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
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginLeft: 12,
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
