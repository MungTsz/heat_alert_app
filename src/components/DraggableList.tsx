// src/components/DraggableList.tsx
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityActionEvent,
  Animated,
  GestureResponderHandlers,
  PanResponder,
  StyleSheet,
  View,
  ViewProps,
} from 'react-native';
import { DRAG_REORDER_CONFIG } from '../config/dragReorderConfig';
import { dragShiftFor, dragTargetIndex } from '../utils/dragReorder';

const {
  holdDelayMs,
  holdMoveTolerancePx,
  liftScale: LIFT_SCALE,
  liftElevation,
  shiftDurationMs,
  settleDurationMs,
} = DRAG_REORDER_CONFIG;

// What a row spreads onto its grip icon's wrapper View. Includes screen
// reader actions so reordering doesn't depend on being able to drag.
export type DragHandleProps = GestureResponderHandlers &
  Pick<
    ViewProps,
    | 'accessible'
    | 'accessibilityLabel'
    | 'accessibilityHint'
    | 'accessibilityActions'
    | 'onAccessibilityAction'
  >;

type Props<T> = {
  items: readonly T[];
  keyExtractor: (item: T) => string;
  // Only the element that receives dragHandle starts a drag, so the rest
  // of the row keeps its own taps (e.g. a hide toggle).
  renderItem: (item: T, dragHandle: DragHandleProps, lifted: boolean) => React.ReactElement;
  // toIndex is the dropped position within `items`.
  onReorder: (key: string, toIndex: number) => void;
  // True while a row is lifted — a parent ScrollView must stop scrolling
  // then, or it would take the touch over mid-drag.
  onDragActiveChange?: (active: boolean) => void;
};

type DragCallbacks = {
  lift: (key: string) => void;
  move: (dy: number) => void;
  drop: () => void;
  step: (key: string, delta: -1 | 1) => void;
};

const ACCESSIBILITY_ACTIONS = [
  { name: 'moveUp', label: 'Move up' },
  { name: 'moveDown', label: 'Move down' },
];

type RowProps = {
  itemKey: string;
  callbacks: React.RefObject<DragCallbacks>;
  children: (dragHandle: DragHandleProps) => React.ReactElement;
};

// Owns one row's hold-then-drag gesture. Built on the core PanResponder
// rather than a gesture library: the app has no react-native-gesture-handler,
// and a short list of single-line rows doesn't need UI-thread gestures.
const DraggableRow: React.FC<RowProps> = ({ itemKey, callbacks, children }) => {
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lifted = useRef(false);

  useEffect(
    () => () => {
      if (holdTimer.current) clearTimeout(holdTimer.current);
    },
    [],
  );

  const dragHandle = useMemo<DragHandleProps>(() => {
    const cancelHold = () => {
      if (holdTimer.current) clearTimeout(holdTimer.current);
      holdTimer.current = null;
    };
    const end = () => {
      cancelHold();
      if (!lifted.current) return;
      lifted.current = false;
      callbacks.current.drop();
    };

    const responder = PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      // The row lifts only after a still hold; a finger that moves first is
      // treated as a scroll (see holdMoveTolerancePx).
      onPanResponderGrant: () => {
        holdTimer.current = setTimeout(() => {
          holdTimer.current = null;
          lifted.current = true;
          callbacks.current.lift(itemKey);
        }, holdDelayMs);
      },
      onPanResponderMove: (_, gesture) => {
        if (lifted.current) {
          callbacks.current.move(gesture.dy);
        } else if (
          Math.abs(gesture.dy) > holdMoveTolerancePx ||
          Math.abs(gesture.dx) > holdMoveTolerancePx
        ) {
          cancelHold();
        }
      },
      // Before the lift the parent ScrollView may take the touch to scroll;
      // once lifted, the drag keeps it.
      onPanResponderTerminationRequest: () => !lifted.current,
      onPanResponderRelease: end,
      onPanResponderTerminate: end,
    });

    return {
      ...responder.panHandlers,
      accessible: true,
      accessibilityLabel: 'Reorder',
      accessibilityHint: 'Hold, then drag up or down to move',
      accessibilityActions: ACCESSIBILITY_ACTIONS,
      onAccessibilityAction: (event: AccessibilityActionEvent) =>
        callbacks.current.step(itemKey, event.nativeEvent.actionName === 'moveUp' ? -1 : 1),
    };
  }, [itemKey, callbacks]);

  return children(dragHandle);
};

// A plain (non-virtualized) list whose rows can be held by their handle
// and dragged to any position. Meant for short lists inside a ScrollView,
// e.g. the Community tab's places in Edit mode.
function DraggableList<T>({
  items,
  keyExtractor,
  renderItem,
  onReorder,
  onDragActiveChange,
}: Props<T>) {
  const [liftedKey, setLiftedKey] = useState<string | null>(null);
  const keys = items.map(keyExtractor);
  const keysRef = useRef(keys);
  keysRef.current = keys;

  // Every row shares one slot height (row + gap), measured off the first row.
  const slotHeight = useRef(0);
  const dragY = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;
  const shifts = useRef(new Map<string, Animated.Value>()).current;
  const drag = useRef<{ key: string; from: number; target: number } | null>(null);
  const resetAfterReorder = useRef(false);

  const shiftOf = (key: string): Animated.Value => {
    let value = shifts.get(key);
    if (!value) {
      value = new Animated.Value(0);
      shifts.set(key, value);
    }
    return value;
  };

  const resetOffsets = () => {
    dragY.setValue(0);
    shifts.forEach(value => value.setValue(0));
  };

  // After a drop the rows are still drawn at their dragged offsets. Zeroing
  // them right after the reordered list commits (and before it paints)
  // makes the new order and the cleared offsets land in the same frame —
  // zeroing at drop time would flash the old order for a frame.
  const orderKey = keys.join('\n');
  useLayoutEffect(() => {
    if (!resetAfterReorder.current) return;
    resetAfterReorder.current = false;
    resetOffsets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderKey]);

  const animateTo = (value: Animated.Value, toValue: number, duration: number) =>
    // JS-driven: dragY is also set per move event, and one Animated.Value
    // can't be both native-driven and set from JS.
    Animated.timing(value, { toValue, duration, useNativeDriver: false });

  const callbacks = useRef<DragCallbacks>(null!);
  callbacks.current = {
    lift: key => {
      const from = keysRef.current.indexOf(key);
      if (from === -1) return;
      drag.current = { key, from, target: from };
      setLiftedKey(key);
      onDragActiveChange?.(true);
      animateTo(scale, LIFT_SCALE, shiftDurationMs).start();
    },
    move: dy => {
      const current = drag.current;
      if (!current) return;
      dragY.setValue(dy);
      const target = dragTargetIndex(current.from, dy, slotHeight.current, keysRef.current.length);
      if (target === current.target) return;
      current.target = target;
      keysRef.current.forEach((key, index) => {
        if (key === current.key) return;
        const slots = dragShiftFor(index, current.from, target);
        animateTo(shiftOf(key), slots * slotHeight.current, shiftDurationMs).start();
      });
    },
    drop: () => {
      const current = drag.current;
      if (!current) return;
      drag.current = null;
      Animated.parallel([
        animateTo(dragY, (current.target - current.from) * slotHeight.current, settleDurationMs),
        animateTo(scale, 1, settleDurationMs),
      ]).start(() => {
        setLiftedKey(null);
        onDragActiveChange?.(false);
        if (current.target === current.from) {
          resetOffsets();
          return;
        }
        resetAfterReorder.current = true;
        onReorder(current.key, current.target);
      });
    },
    step: (key, delta) => {
      const from = keysRef.current.indexOf(key);
      const to = from + delta;
      if (from === -1 || to < 0 || to >= keysRef.current.length) return;
      onReorder(key, to);
    },
  };

  return (
    <View>
      {items.map((item, index) => {
        const key = keys[index];
        const lifted = key === liftedKey;
        return (
          <Animated.View
            key={key}
            onLayout={
              index === 0
                ? event => {
                    slotHeight.current = event.nativeEvent.layout.height;
                  }
                : undefined
            }
            style={[
              lifted && styles.lifted,
              {
                transform: lifted
                  ? [{ translateY: dragY }, { scale }]
                  : [{ translateY: shiftOf(key) }],
              },
            ]}
          >
            <DraggableRow itemKey={key} callbacks={callbacks}>
              {dragHandle => renderItem(item, dragHandle, lifted)}
            </DraggableRow>
          </Animated.View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  // Draws the lifted row above the neighbours it slides over (elevation is
  // what orders siblings on Android; zIndex on iOS).
  lifted: { zIndex: 1, elevation: liftElevation },
});

export default DraggableList;
