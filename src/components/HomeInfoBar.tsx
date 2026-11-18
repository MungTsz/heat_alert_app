// src/components/HomeInfoBar.tsx
import React, { useMemo, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, PanResponder, ScrollView } from 'react-native';
import Animated, { FadeInRight, FadeOutRight } from 'react-native-reanimated';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { glassCardStyle } from '../styles/glassCard';
import { HOME_INFO_BAR_COPY } from '../config/alertCopy';
import { HOME_INFO_BAR_CONFIG, HOME_LAYOUT_CONFIG } from '../config/homeLayoutConfig';
import HomeInfoBlock, { HomeInfoBlockData } from './HomeInfoBlock';

type Props = {
  // Height of the scene area the bar lives in (and the swipe area).
  height: number;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  blocks: HomeInfoBlockData[];
};

const C = HOME_INFO_BAR_CONFIG;
// Widens the tab's touch area to at least minTouchSize each way without
// making the tab itself bigger on the scene.
const TAB_HIT_SLOP = {
  left: Math.max(0, (C.minTouchSize - C.tabWidth) / 2),
  right: Math.max(0, (C.minTouchSize - C.tabWidth) / 2),
  top: Math.max(0, (C.minTouchSize - C.tabHeight) / 2),
  bottom: Math.max(0, (C.minTouchSize - C.tabHeight) / 2),
};
// A drag only becomes a swipe once it has moved this far, and mostly
// sideways — so taps on the blocks and the page's vertical scroll are left
// alone.
const SWIPE_CLAIM_DISTANCE = 10;
const isHorizontalDrag = (dx: number, dy: number) =>
  Math.abs(dx) > SWIPE_CLAIM_DISTANCE && Math.abs(dx) > Math.abs(dy) * 1.5;

// The raw readings, tucked away on the scene's right edge: Heat index,
// AQHI, Temp and Humidity. Opened with the pull tab or by swiping left
// anywhere on the scene (right closes it). The blocks slide in as one
// narrow column over the scene — the character doesn't move — and when the
// column is taller than the scene area it scrolls on its own.
const HomeInfoBar: React.FC<Props> = ({ height, expanded, onExpandedChange, blocks }) => {
  // The responder is created once; the ref keeps it calling the latest
  // callback.
  const onChangeRef = useRef(onExpandedChange);
  onChangeRef.current = onExpandedChange;

  const swipe = useMemo(
    () =>
      PanResponder.create({
        // Capture, so a swipe that starts on a block still counts.
        onMoveShouldSetPanResponderCapture: (_e, g) => isHorizontalDrag(g.dx, g.dy),
        onPanResponderRelease: (_e, g) => {
          if (g.dx <= -C.swipeMinDistance) onChangeRef.current(true);
          else if (g.dx >= C.swipeMinDistance) onChangeRef.current(false);
        },
        onPanResponderTerminationRequest: () => true,
      }),
    [],
  );

  const Chevron = expanded ? ChevronRight : ChevronLeft;
  return (
    <View style={[styles.area, { height }]} {...swipe.panHandlers}>
      <View style={styles.bar}>
        {expanded && (
          <Animated.View
            entering={FadeInRight.duration(C.animationMs)}
            exiting={FadeOutRight.duration(C.animationMs)}
            style={{ maxHeight: height }}
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
          </Animated.View>
        )}
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
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  area: { alignItems: 'flex-end', justifyContent: 'center' },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: C.tabGap,
    // Into the scroll content's side padding, so the tab sits flush with
    // the screen edge like a pull tab.
    marginRight: -HOME_LAYOUT_CONFIG.screenPadding,
  },
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
