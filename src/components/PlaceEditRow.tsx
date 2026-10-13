// src/components/PlaceEditRow.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Eye, EyeOff, GripVertical } from 'lucide-react-native';
import { PlaceCategory } from '../types/bookmark';
import { PLACE_CATEGORY_CONFIG } from '../config/placeCategoryConfig';
import { EXPOSURE_IO_CONFIG } from '../config/exposureIoConfig';
import { DRAG_REORDER_CONFIG } from '../config/dragReorderConfig';
import { DragHandleProps } from './DraggableList';

const ACTION_HIT_SLOP = { top: 8, bottom: 8, left: 8, right: 8 };
const ACTIVE_COLOR = '#333';
const GRIP_COLOR = '#8E8E93';

type Props = {
  label: string;
  category: PlaceCategory;
  hidden: boolean;
  onToggleHidden: () => void;
  // From DraggableList — omitted in the Hidden places section, since order
  // is only edited for the places shown in the watch list.
  dragHandle?: DragHandleProps;
  // Picked up and being dragged.
  lifted?: boolean;
  onPress?: () => void;
};

// A compact one-line place row for the Community tab's Edit mode and its
// Hidden places section. No heat/AQHI badges or rename/type/delete actions:
// while reordering, a short row fits more places on screen and the
// destructive actions are out of reach of a mis-tap. Single-line on
// purpose — DraggableList assumes every row has the same height.
const PlaceEditRow: React.FC<Props> = ({
  label,
  category,
  hidden,
  onToggleHidden,
  dragHandle,
  lifted = false,
  onPress,
}) => {
  const { Icon } = PLACE_CATEGORY_CONFIG[category];
  const VisibilityIcon = hidden ? Eye : EyeOff;

  return (
    <TouchableOpacity
      style={[styles.row, lifted && styles.rowLifted]}
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

      <TouchableOpacity
        onPress={onToggleHidden}
        hitSlop={ACTION_HIT_SLOP}
        accessibilityLabel={hidden ? 'Show in list' : 'Hide from list'}
      >
        <VisibilityIcon size={18} color={ACTIVE_COLOR} />
      </TouchableOpacity>
      {/* Trailing edge, like the iOS reorder control: hold it, then drag. */}
      {dragHandle && (
        <View {...dragHandle} hitSlop={ACTION_HIT_SLOP}>
          <GripVertical size={20} color={lifted ? ACTIVE_COLOR : GRIP_COLOR} />
        </View>
      )}
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
  rowLifted: {
    elevation: DRAG_REORDER_CONFIG.liftElevation,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  // Same icon/label spacing as BookmarkCard's title row.
  labelRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  label: { flexShrink: 1, fontSize: 15, fontWeight: '600', color: '#222' },
  labelHidden: { color: '#888' },
});

export default PlaceEditRow;
