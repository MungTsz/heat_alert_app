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
import { Flame, Users, Settings } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export type TabName = 'HeatIndex' | 'Community' | 'Settings';

interface Props {
  activeTab: TabName;
  onTabChange: (tab: TabName) => void;
}

const TABS: TabName[] = ['HeatIndex', 'Community', 'Settings'];

const FloatingNavBar: React.FC<Props> = ({ activeTab, onTabChange }) => {
  const insets = useSafeAreaInsets();
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const bubbleAnim = useRef(new Animated.Value(0)).current;

  const activeIndex = TABS.indexOf(activeTab);

  const tabWidth = containerWidth / TABS.length;
  const bubbleWidth = 72;
  const bubbleHeight = 52;

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
      {TABS.map(tab => {
        const isActive = activeTab === tab;
        return (
          <TouchableOpacity
            key={tab}
            style={styles.tab}
            onPress={() => onTabChange(tab)}
            activeOpacity={0.8}
          >
            {tab === 'HeatIndex' && (
              <Flame
                size={22}
                color={isActive ? '#000000' : '#8E8E93'}
                fill={isActive ? '#000000' : 'none'}
              />
            )}
            {tab === 'Community' && (
              <Users
                size={22}
                color={isActive ? '#000000' : '#8E8E93'}
                fill={isActive ? '#000000' : 'none'}
              />
            )}
            {tab === 'Settings' && (
              <Settings size={22} color={isActive ? '#000000' : '#8E8E93'} />
            )}
            <Text style={[styles.label, isActive && styles.activeLabel]}>
              {tab === 'HeatIndex' ? 'Heat Index' : tab}
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
  label: {
    fontSize: 10,
    fontWeight: '500',
    color: '#8E8E93',
  },
  activeLabel: {
    color: '#000000',
    fontWeight: '700',
  },
});

export default FloatingNavBar;
