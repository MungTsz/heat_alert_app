// src/components/PlaceEditRow.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ArrowDown, ArrowUp, Eye, EyeOff } from 'lucide-react-native';
import { PlaceCategory } from '../types/bookmark';
import { PLACE_CATEGORY_CONFIG } from '../config/placeCategoryConfig';
import { EXPOSURE_IO_CONFIG } from '../config/exposureIoConfig';

const ACTION_HIT_SLOP = { top: 8, bottom: 8, left: 8, right: 8 };
const ACTIVE_COLOR = '#333';
const DISABLED_COLOR = '#C7C7CC';

type Props = {
  label: string;
  category: PlaceCategory;
  hidden: boolean;
  onToggleHidden: () => void;
  // Omitted in the Hidden places section — order is only edited for the
  // places shown in the watch list.
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  onPress?: () => void;
};

// A compact one-line place row for the Community tab's Edit mode and its
// Hidden places section. No heat/AQHI badges or rename/type/delete actions:
// while reordering, a short row fits more places on screen and the
// destructive actions are out of reach of a mis-tap.
const PlaceEditRow: React.FC<Props> = ({
  label,
  category,
  hidden,
  onToggleHidden,
  onMoveUp,
  onMoveDown,
  canMoveUp = false,
  canMoveDown = false,
  onPress,
}) => {
  const { Icon } = PLACE_CATEGORY_CONFIG[category];
  const VisibilityIcon = hidden ? Eye : EyeOff;

  return (
    <TouchableOpacity
      style={styles.row}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={0.7}
    >
      <View style={styles.labelRow}>
        <Icon size={16} color={EXPOSURE_IO_CONFIG[category].color} />
        <Text style={[styles.label, hidden && styles.labelHidden]} numberOfLines={1}>
          {label}
        </Text>
      </View>

      {onMoveUp && (
        <TouchableOpacity
          onPress={onMoveUp}
          disabled={!canMoveUp}
          hitSlop={ACTION_HIT_SLOP}
          accessibilityLabel="Move up"
        >
          <ArrowUp size={18} color={canMoveUp ? ACTIVE_COLOR : DISABLED_COLOR} />
        </TouchableOpacity>
      )}
      {onMoveDown && (
        <TouchableOpacity
          onPress={onMoveDown}
          disabled={!canMoveDown}
          hitSlop={ACTION_HIT_SLOP}
          accessibilityLabel="Move down"
        >
          <ArrowDown size={18} color={canMoveDown ? ACTIVE_COLOR : DISABLED_COLOR} />
        </TouchableOpacity>
      )}
      <TouchableOpacity
        onPress={onToggleHidden}
        hitSlop={ACTION_HIT_SLOP}
        accessibilityLabel={hidden ? 'Show in list' : 'Hide from list'}
      >
        <VisibilityIcon size={18} color={ACTIVE_COLOR} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: '#E2E2E2',
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  // Same icon/label spacing as BookmarkCard's title row.
  labelRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  label: { flexShrink: 1, fontSize: 15, fontWeight: '600', color: '#222' },
  labelHidden: { color: '#888' },
});

export default PlaceEditRow;
