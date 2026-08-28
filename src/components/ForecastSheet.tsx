// src/components/ForecastSheet.tsx
import React, { PropsWithChildren, useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  runOnJS,
} from 'react-native-reanimated';

const SCREEN_HEIGHT = Dimensions.get('window').height;

type Props = PropsWithChildren<{
  visible: boolean;
  title: string;
  onClose: () => void;
}>;

const ForecastSheet: React.FC<Props> = ({
  visible,
  title,
  onClose,
  children,
}) => {
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(SCREEN_HEIGHT);
  const [contentReady, setContentReady] = useState(false);

  useEffect(() => {
    if (visible) {
      setContentReady(false);
      translateY.value = withTiming(
        0,
        { duration: 260, easing: Easing.out(Easing.cubic) },
        finished => {
          if (finished) runOnJS(setContentReady)(true);
        },
      );
    } else {
      setContentReady(false);
      translateY.value = withTiming(SCREEN_HEIGHT, {
        duration: 220,
        easing: Easing.in(Easing.cubic),
      });
    }
  }, [visible]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Modal visible={visible} transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.backdropTapArea}
          activeOpacity={1}
          onPress={onClose}
        />
        <Animated.View
          style={[
            styles.sheet,
            { paddingBottom: 20 + insets.bottom },
            animatedStyle,
          ]}
        >
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <X size={22} color="#333" />
            </TouchableOpacity>
          </View>
          {/* Heavy chart math only runs once the slide-in has fully settled */}
          {contentReady ? children : <View style={styles.placeholder} />}
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  backdropTapArea: { flex: 1 },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '75%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  title: { fontSize: 18, fontWeight: 'bold', color: '#222' },
  placeholder: { height: 260 },
});

export default ForecastSheet;
