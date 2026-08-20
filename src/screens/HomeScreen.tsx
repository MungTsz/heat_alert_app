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
import { MapPin, User, Wind } from 'lucide-react-native';
import TextTicker from 'react-native-text-ticker';
import CurrentWeatherInfo from '../components/CurrentWeatherInfo';
import DailyHeatForecastCard from '../components/DailyHeatForecastCard';
import AqhiHourlyForecastChart from '../components/AqhiHourlyForecastChart';
import HazardCard from '../components/HazardCard';
import ForecastSheet from '../components/ForecastSheet';
import MapScreen from './MapScreen';
import { useLocation } from '../utils/useLocation';
import { getHeatIndexInfo } from '../utils/heatIndexUtils';
import { getAqhiTextColor, getAqhiInfo } from '../utils/aqhiUtils';
import HeatScene from '../components/scene/HeatScene';
import { computeSceneLayout } from '../utils/sceneLayout';
import { useForecastData } from '../hooks/useForecastData';
import { useAqhiForecastData } from '../hooks/useAqhiForecastData';
import { useAqhiData } from '../hooks/useAqhiData';
import { idwInterpolate } from '../utils/idw';

const LOCATION_BOX_WIDTH = 160;
const MIN_GAP_BELOW_CHARACTER = 24;
const FALLBACK_LAT = 22.3375;
const FALLBACK_LNG = 114.263;

const HomeScreen = () => {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { locationText, loading, coords } = useLocation();

  const effectiveCenter = coords ?? {
    latitude: FALLBACK_LAT,
    longitude: FALLBACK_LNG,
  };

  const { days: heatForecastDays } = useForecastData(effectiveCenter);
  const { days: aqhiForecastDays } = useAqhiForecastData(effectiveCenter);
  const { points: aqhiPoints } = useAqhiData(effectiveCenter);

  const currentAqhi = Math.round(
    idwInterpolate(
      effectiveCenter.latitude,
      effectiveCenter.longitude,
      aqhiPoints.map(p => ({
        latitude: p.latitude,
        longitude: p.longitude,
        value: p.aqhi,
      })),
    ),
  );

  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler(event => {
    scrollY.value = event.contentOffset.y;
  });

  const heatIndexTemp = 42;
  const actualTemp = 36;
  const currentHumidity = 80;

  const heatInfo = getHeatIndexInfo(heatIndexTemp);
  const aqhiInfo = getAqhiInfo(currentAqhi);
  const layout = computeSceneLayout(width, height);

  const [contentAboveHeight, setContentAboveHeight] = useState(0);
  const onContentAboveLayout = useCallback((e: LayoutChangeEvent) => {
    setContentAboveHeight(e.nativeEvent.layout.y + e.nativeEvent.layout.height);
  }, []);

  const characterBottomInScrollSpace = layout.bottomY - insets.top;
  const spacerHeight = Math.max(
    characterBottomInScrollSpace - contentAboveHeight + MIN_GAP_BELOW_CHARACTER,
    MIN_GAP_BELOW_CHARACTER,
  );

  const [heatSheetOpen, setHeatSheetOpen] = useState(false);
  const [aqhiSheetOpen, setAqhiSheetOpen] = useState(false);

  return (
    <View style={styles.mainContainer}>
      <View style={StyleSheet.absoluteFill}>
        <HeatScene
          width={width}
          height={height}
          temperatureCelsius={heatIndexTemp}
          aqhi={currentAqhi}
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
                Environment
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
          </View>

          <View style={{ height: spacerHeight }} />

          {/* Equal-weight Heat Index and AQHI cards, both tappable */}
          <View style={styles.hazardRow}>
            // heat card:
            <HazardCard
              icon={<User size={18} color="#FFFFFF" />}
              label="Feels Like..."
              value={`${heatIndexTemp}°`}
              classification={heatInfo.classification}
              valueColor={heatInfo.color}
              onPress={() => setHeatSheetOpen(true)}
            />
            // aqhi card:
            <HazardCard
              icon={<Wind size={18} color="#FFFFFF" />}
              label="AQHI"
              value={`${currentAqhi}`}
              classification={aqhiInfo.classification}
              valueColor={getAqhiTextColor(currentAqhi)} // dark, readable, still hazard-coded
              onPress={() => setAqhiSheetOpen(true)}
            />
          </View>

          <CurrentWeatherInfo
            temperature={actualTemp}
            humidity={currentHumidity}
          />

          <View style={styles.mapContainer}>
            <MapScreen />
          </View>
        </Animated.ScrollView>
      </SafeAreaView>

      <ForecastSheet
        visible={heatSheetOpen}
        title="Heat Index Forecast"
        onClose={() => setHeatSheetOpen(false)}
      >
        <DailyHeatForecastCard days={heatForecastDays} />
      </ForecastSheet>

      <ForecastSheet
        visible={aqhiSheetOpen}
        title="AQHI Forecast"
        onClose={() => setAqhiSheetOpen(false)}
      >
        <AqhiHourlyForecastChart days={aqhiForecastDays} />
      </ForecastSheet>
    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: '#F5F5F5' },
  safeArea: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 140 },
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
  locationContainer: { flexDirection: 'row', alignItems: 'center' },
  locationIcon: { marginRight: 6, flexShrink: 0 },
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
  hazardRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  mapContainer: {
    height: 380,
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 16,
  },
});

export default HomeScreen;
