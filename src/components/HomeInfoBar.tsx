// src/components/HomeInfoBar.tsx
import React, { useEffect, useMemo, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, PanResponder, ScrollView } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { glassCardStyle } from '../styles/glassCard';
import { HOME_INFO_BAR_COPY } from '../config/alertCopy';
import { HOME_INFO_BAR_CONFIG, HOME_LAYOUT_CONFIG } from '../config/homeLayoutConfig';
import HomeInfoBlock, { HomeInfoBlockData } from './HomeInfoBlock';

type Props = {
  // Height of the scene area the bar lives in (and the drag area).
  height: number;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  blocks: HomeInfoBlockData[];
};

const C = HOME_INFO_BAR_CONFIG;
// How far the panel slides: closed, everything but the tab is past the
// screen's right edge; open, it sits fully on screen (offset 0).
const CLOSED_OFFSET = C.tabGap + C.blockWidth + C.edgeGap;
const offsetFor = (expanded: boolean) => (expanded ? 0 : CLOSED_OFFSET);
const clamp = (value: number) => Math.min(CLOSED_OFFSET, Math.max(0, value));

// Widens the tab's touch area to at least minTouchSize each way without
// making the tab itself bigger on the scene.
const TAB_HIT_SLOP = {
  left: Math.max(0, (C.minTouchSize - C.tabWidth) / 2),
  right: Math.max(0, (C.minTouchSize - C.tabWidth) / 2),
  top: Math.max(0, (C.minTouchSize - C.tabHeight) / 2),
  bottom: Math.max(0, (C.minTouchSize - C.tabHeight) / 2),
};
// A drag only becomes a bar drag once it has moved this far, and mostly
// sideways — so taps on the blocks and the page's vertical scroll are left
// alone.
const DRAG_CLAIM_DISTANCE = 8;
const isHorizontalDrag = (dx: number, dy: number) =>
  Math.abs(dx) > DRAG_CLAIM_DISTANCE && Math.abs(dx) > Math.abs(dy) * 1.5;

// The raw readings, tucked away on the scene's right edge like a drawer:
// Heat index, AQHI, Temp and Humidity. Drag anywhere on the scene and the
// bar follows the finger out from the edge (or back in); let go and it
// snaps open or closed. The pull tab toggles it with a tap. It slides over
// the scene — the character doesn't move — as one narrow column that
// scrolls on its own when taller than the scene area.
const HomeInfoBar: React.FC<Props> = ({ height, expanded, onExpandedChange, blocks }) => {
  const offset = useSharedValue(offsetFor(expanded));
  // The responder is created once; refs keep it reading the latest props.
  const onChangeRef = useRef(onExpandedChange);
  onChangeRef.current = onExpandedChange;
  const dragStart = useRef(0);

  // Follows the open state when it changes from outside a drag: the stored
  // choice loading at launch, or a tap on the tab.
  useEffect(() => {
    offset.value = withTiming(offsetFor(expanded), { duration: C.animationMs });
  }, [expanded, offset]);

  const drag = useMemo(
    () =>
      PanResponder.create({
        // Capture, so a drag that starts on a block still moves the bar.
        onMoveShouldSetPanResponderCapture: (_e, g) => isHorizontalDrag(g.dx, g.dy),
        onPanResponderGrant: () => {
          dragStart.current = offset.value;
        },
        onPanResponderMove: (_e, g) => {
          // Finger left (dx < 0) pulls the bar out (offset towards 0).
          offset.value = clamp(dragStart.current + g.dx);
        },
        onPanResponderRelease: (_e, g) => {
          let open: boolean;
          if (g.vx <= -C.flingVelocity) open = true;
          else if (g.vx >= C.flingVelocity) open = false;
          else open = offset.value <= CLOSED_OFFSET * (1 - C.snapOpenFraction);
          offset.value = withTiming(offsetFor(open), { duration: C.animationMs });
          onChangeRef.current(open);
        },
        // Interrupted (e.g. the page took over): settle where it is closest.
        onPanResponderTerminate: () => {
          const open = offset.value <= CLOSED_OFFSET / 2;
          offset.value = withTiming(offsetFor(open), { duration: C.animationMs });
          onChangeRef.current(open);
        },
        onPanResponderTerminationRequest: () => true,
      }),
    [offset],
  );

  const panelStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: offset.value }],
  }));

  const Chevron = expanded ? ChevronRight : ChevronLeft;
  return (
    <View style={[styles.area, { height }]} {...drag.panHandlers}>
      <Animated.View style={[styles.panel, panelStyle]}>
        <TouchableOpacity
          style={styles.tab}
          onPress={() => onExpandedChange(!expanded)}
          hitSlop={TAB_HIT_SLOP}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityState={{ expanded }}
          accessibilityLabel={
            expanded ? HOME_INFO_BAR_COPY.collapseLabel : HOME_INFO_BAR_COPY.expandLabel
          }
        >
          <Chevron size={C.tabIconSize} color="#FFFFFF" />
        </TouchableOpacity>
        {/* Always mounted so it can be dragged out; hidden from screen
            readers while it is off screen. */}
        <View
          style={[styles.column, { maxHeight: height }]}
          importantForAccessibility={expanded ? 'auto' : 'no-hide-descendants'}
          accessibilityElementsHidden={!expanded}
        >
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.blocks}
            showsVerticalScrollIndicator={false}
            // Android: let this column scroll inside Home's own ScrollView.
            nestedScrollEnabled
          >
            {blocks.map(block => (
              <HomeInfoBlock key={block.key} block={block} />
            ))}
          </ScrollView>
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  area: { alignItems: 'flex-end', justifyContent: 'center' },
  // Tab on the drawer's leading edge, blocks behind it. Pushed into the
  // scroll content's side padding so, closed, the tab sits flush with the
  // screen edge like a pull tab.
  panel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: C.tabGap,
    marginRight: C.edgeGap - HOME_LAYOUT_CONFIG.screenPadding,
  },
  column: { width: C.blockWidth },
  scroll: { flexGrow: 0 },
  blocks: { gap: C.blockGap },
  tab: {
    ...glassCardStyle,
    width: C.tabWidth,
    height: C.tabHeight,
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
    borderRightWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default HomeInfoBar;
