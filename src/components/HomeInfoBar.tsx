// src/components/HomeInfoBar.tsx
import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import Animated, { FadeInRight, FadeOutRight } from 'react-native-reanimated';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { glassCardStyle } from '../styles/glassCard';
import { HOME_INFO_BAR_COPY } from '../config/alertCopy';
import { HOME_INFO_BAR_CONFIG, HOME_LAYOUT_CONFIG } from '../config/homeLayoutConfig';
import { HomeInfoBarArrangement } from '../utils/homeInfoBarLayout';
import HomeInfoBlock, { HomeInfoBlockData } from './HomeInfoBlock';

type Props = {
  expanded: boolean;
  onToggle: () => void;
  arrangement: HomeInfoBarArrangement;
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

// The raw readings, tucked away on the scene's right edge: Heat index,
// AQHI, Temp and Humidity, one tap from the pull tab. Closed, only the tab
// shows; open, the blocks slide in beside it (one column, or a 2 × 2 grid
// on short scenes) and Home moves the cartoon over so they don't cover it.
const HomeInfoBar: React.FC<Props> = ({ expanded, onToggle, arrangement, blocks }) => {
  const Chevron = expanded ? ChevronRight : ChevronLeft;
  return (
    <View style={styles.bar}>
      {expanded && (
        <Animated.View
          entering={FadeInRight.duration(C.animationMs)}
          exiting={FadeOutRight.duration(C.animationMs)}
          style={[styles.blocks, arrangement === 'grid' && styles.blocksGrid]}
        >
          {blocks.map(block => (
            <HomeInfoBlock key={block.key} block={block} />
          ))}
        </Animated.View>
      )}
      <TouchableOpacity
        style={styles.tab}
        onPress={onToggle}
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
  );
};

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: C.tabGap,
    // Into the scroll content's side padding, so the tab sits flush with
    // the screen edge like a pull tab.
    marginRight: -HOME_LAYOUT_CONFIG.screenPadding,
  },
  blocks: { gap: C.blockGap },
  blocksGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: 2 * C.blockWidth + C.blockGap,
  },
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
