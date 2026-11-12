// src/components/FloatingNavBar.tsx
import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Platform,
  LayoutChangeEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NAV_BAR_CONFIG, NAV_TABS, TabName } from '../config/navConfig';

interface Props {
  activeTab: TabName;
  onTabChange: (tab: TabName) => void;
  // Tabs showing a small dot on their icon (e.g. Alerts while an alert is
  // active), so it is noticed from any tab.
  dottedTabs?: readonly TabName[];
}

const { bubbleWidth, bubbleHeight } = NAV_BAR_CONFIG;

const FloatingNavBar: React.FC<Props> = ({ activeTab, onTabChange, dottedTabs = [] }) => {
  const insets = useSafeAreaInsets();
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const bubbleAnim = useRef(new Animated.Value(0)).current;

  const activeIndex = NAV_TABS.findIndex(tab => tab.key === activeTab);

  const tabWidth = containerWidth / NAV_TABS.length;

  useEffect(() => {
    if (containerWidth > 0 && activeIndex !== -1) {
      const targetX = activeIndex * tabWidth + (tabWidth - bubbleWidth) / 2;
      Animated.spring(bubbleAnim, {
        toValue: targetX,
        useNativeDriver: true,
        bounciness: 6,
        speed: 14,
      }).start();
    }
  }, [activeIndex, containerWidth, tabWidth]);

  const handleLayout = (e: LayoutChangeEvent) => {
    setContainerWidth(e.nativeEvent.layout.width);
  };

  const bottomPosition = Math.max(
    insets.bottom + 12,
    Platform.OS === 'android' ? 36 : 20,
  );

  return (
    <View
      style={[styles.container, { bottom: bottomPosition }]}
      onLayout={handleLayout}
    >
      {/* Sliding Active Bubble Background */}
      {containerWidth > 0 && (
        <Animated.View
          style={[
            styles.activeBubble,
            {
              width: bubbleWidth,
              height: bubbleHeight,
              transform: [{ translateX: bubbleAnim }],
            },
          ]}
        />
      )}

      {/* Tabs */}
      {NAV_TABS.map(({ key, label, icon: Icon, fillWhenActive }) => {
        const isActive = activeTab === key;
        const color = isActive ? NAV_BAR_CONFIG.activeColor : NAV_BAR_CONFIG.inactiveColor;
        return (
          <TouchableOpacity
            key={key}
            style={styles.tab}
            onPress={() => onTabChange(key)}
            activeOpacity={0.8}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
          >
            <View>
              <Icon
                size={NAV_BAR_CONFIG.iconSize}
                color={color}
                fill={isActive && fillWhenActive ? color : 'none'}
              />
              {dottedTabs.includes(key) && <View style={styles.dot} />}
            </View>
            <Text style={[styles.label, isActive && styles.activeLabel]}>
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 20,
    right: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.95)', // Semi-transparent glass background
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)', // Soft edge definition without shadow
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    height: 64,
    borderRadius: 40,
    zIndex: 999,
  },
  activeBubble: {
    position: 'absolute',
    left: 0,
    top: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
    borderRadius: 26,
    zIndex: 0,
  },
  tab: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    height: '100%',
    zIndex: 1,
    gap: 3,
  },
  dot: {
    position: 'absolute',
    top: -1,
    right: -3,
    width: NAV_BAR_CONFIG.dotSize,
    height: NAV_BAR_CONFIG.dotSize,
    borderRadius: NAV_BAR_CONFIG.dotSize / 2,
    backgroundColor: NAV_BAR_CONFIG.dotColor,
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  label: {
    fontSize: 10,
    fontWeight: '500',
    color: NAV_BAR_CONFIG.inactiveColor,
  },
  activeLabel: {
    color: NAV_BAR_CONFIG.activeColor,
    fontWeight: '700',
  },
});

export default FloatingNavBar;
