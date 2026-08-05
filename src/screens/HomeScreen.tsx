// src/screens/HomeScreen.tsx
import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ActivityIndicator,
  useWindowDimensions,
  LayoutChangeEvent,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
} from 'react-native-reanimated';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { MapPin } from 'lucide-react-native';
import TextTicker from 'react-native-text-ticker';
import CurrentWeatherInfo from '../components/CurrentWeatherInfo';
import DailyHeatForecastCard from '../components/DailyHeatForecastCard';
import MapScreen from './MapScreen';
import { useLocation } from '../utils/useLocation';
import { getHeatIndexInfo } from '../utils/heatIndexUtils';
import HeatScene from '../components/scene/HeatScene';
import { computeSceneLayout } from '../utils/sceneLayout';

const LOCATION_BOX_WIDTH = 160;
const MIN_GAP_BELOW_CHARACTER = 24; // guaranteed breathing room even on tall/short screens

const HomeScreen = () => {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { locationText, loading } = useLocation();

  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler(event => {
    scrollY.value = event.contentOffset.y;
  });

  const heatIndexTemp = 42;
  const actualTemp = 36;
  const currentHumidity = 80;

  const { classification } = getHeatIndexInfo(heatIndexTemp);
  const layout = computeSceneLayout(width, height);

  // Measure the actual rendered height of everything above the spacer,
  // since the Skia canvas (character) and ScrollView content (text) are
  // separate coordinate systems that don't automatically know about each other.
  const [contentAboveHeight, setContentAboveHeight] = useState(0);

  const onContentAboveLayout = useCallback((e: LayoutChangeEvent) => {
    setContentAboveHeight(e.nativeEvent.layout.y + e.nativeEvent.layout.height);
  }, []);

  // Canvas Y=0 starts at the very top of the window; ScrollView content
  // starts after the safe-area top inset. This converts layout.bottomY
  // (character's feet, in canvas space) into ScrollView space.
  const characterBottomInScrollSpace = layout.bottomY - insets.top;

  const spacerHeight = Math.max(
    characterBottomInScrollSpace - contentAboveHeight + MIN_GAP_BELOW_CHARACTER,
    MIN_GAP_BELOW_CHARACTER,
  );

  return (
    <View style={styles.mainContainer}>
      <View style={StyleSheet.absoluteFill}>
        <HeatScene
          width={width}
          height={height}
          temperatureCelsius={heatIndexTemp}
          scrollY={scrollY}
        />
      </View>

      <SafeAreaView style={styles.safeArea}>
        <Animated.ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          onScroll={scrollHandler}
          scrollEventThrottle={16}
        >
          <View onLayout={onContentAboveLayout}>
            <View style={styles.headerRow}>
              <Text style={styles.headerTitle} numberOfLines={1}>
                Heat Index
              </Text>
              <View style={styles.locationContainer}>
                <MapPin size={22} color="#FFFFFF" style={styles.locationIcon} />
                <View style={styles.locationBox}>
                  {loading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <TextTicker
                      style={styles.animatingText}
                      duration={8000}
                      loop
                      bounce={false}
                      repeatSpacer={40}
                      marqueeDelay={1500}
                      isInteraction={false}
                    >
                      {locationText}
                    </TextTicker>
                  )}
                </View>
              </View>
            </View>

            <View
              style={[
                styles.heatInfoContainer,
                { marginLeft: width * 0.06, marginTop: 20 },
              ]}
            >
              <Text style={styles.feelsLikeTitle}>Feels Like</Text>
              <Text style={styles.temperatureText} numberOfLines={1}>
                {heatIndexTemp}°
              </Text>
              <Text style={styles.classificationText} numberOfLines={1}>
                {classification}
              </Text>
            </View>
          </View>

          {/* Dynamically sized so the character's feet always clear this
              spacer before the weather pill begins — no more overlap. */}
          <View style={{ height: spacerHeight }} />

          <CurrentWeatherInfo
            temperature={actualTemp}
            humidity={currentHumidity}
          />

          <View style={styles.mapContainer}>
            <MapScreen />
          </View>

          <DailyHeatForecastCard />
        </Animated.ScrollView>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 140,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    gap: 8,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#FFFFFF',
    flexShrink: 0,
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowRadius: 4,
    textShadowOffset: { width: 0, height: 1 },
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationIcon: {
    marginRight: 6,
    flexShrink: 0,
  },
  locationBox: {
    width: LOCATION_BOX_WIDTH,
    height: 24,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  animatingText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowRadius: 3,
  },
  heatInfoContainer: {
    justifyContent: 'center',
    marginTop: 20,
  },
  feelsLikeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowRadius: 4,
    textShadowOffset: { width: 0, height: 1 },
  },
  temperatureText: {
    fontSize: 58,
    fontWeight: 'bold',
    color: '#FFFFFF',
    includeFontPadding: false,
    textShadowColor: 'rgba(0,0,0,0.25)',
    textShadowRadius: 6,
    textShadowOffset: { width: 0, height: 2 },
  },
  classificationText: {
    fontSize: 21,
    fontWeight: '700',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowRadius: 4,
    textShadowOffset: { width: 0, height: 1 },
  },
  mapContainer: {
    height: 380,
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 16,
  },
});

export default HomeScreen;
