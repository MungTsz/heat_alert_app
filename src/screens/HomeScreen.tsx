// src/screens/HomeScreen.tsx
import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MapPin } from 'lucide-react-native';
import TextTicker from 'react-native-text-ticker';
import CurrentWeatherInfo from '../components/CurrentWeatherInfo';
import DailyHeatForecastCard from '../components/DailyHeatForecastCard';
import MapScreen from './MapScreen';
import { useLocation } from '../utils/useLocation';
import { getHeatIndexInfo } from '../utils/heatIndexUtils';
import HeatScene from '../components/scene/HeatScene';

const LOCATION_BOX_WIDTH = 160;

const HomeScreen = () => {
  const { width, height } = useWindowDimensions();
  const { locationText, loading } = useLocation();

  // Shared scroll position value
  const scrollY = useSharedValue(0);

  // Scroll handler to track scroll distance on the UI thread
  const scrollHandler = useAnimatedScrollHandler(event => {
    scrollY.value = event.contentOffset.y;
  });

  const heatIndexTemp = 42;
  const actualTemp = 36;
  const currentHumidity = 80;

  const { classification, risk } = getHeatIndexInfo(heatIndexTemp);

  return (
    <View style={styles.mainContainer}>
      {/* Background Skia Canvas receiving scrollY */}
      <View style={StyleSheet.absoluteFill}>
        <HeatScene
          width={width}
          height={height}
          temperatureCelsius={heatIndexTemp}
          scrollY={scrollY}
        />
      </View>

      {/* Foreground UI */}
      <SafeAreaView style={styles.safeArea}>
        <Animated.ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          onScroll={scrollHandler}
          scrollEventThrottle={16} // 60fps scroll updates
        >
          {/* Header Row */}
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

          {/* Floating Heat Info Text */}
          <View style={styles.heatInfoContainer}>
            <Text style={styles.feelsLikeTitle}>Feels Like</Text>
            <Text style={styles.temperatureText}>{heatIndexTemp}°</Text>
            <Text style={styles.classificationText}>{classification}</Text>
            {risk ? (
              <Text style={styles.advisoryText} numberOfLines={2}>
                {risk}
              </Text>
            ) : null}
          </View>

          {/* Weather Cards */}
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
    marginBottom: 16,
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
    alignItems: 'flex-start',
    marginTop: 10,
    marginBottom: 200,
    paddingLeft: 16,
  },
  feelsLikeTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowRadius: 4,
    textShadowOffset: { width: 0, height: 1 },
  },
  temperatureText: {
    fontSize: 84,
    fontWeight: 'bold',
    color: '#FFFFFF',
    includeFontPadding: false,
    textShadowColor: 'rgba(0,0,0,0.25)',
    textShadowRadius: 6,
    textShadowOffset: { width: 0, height: 2 },
  },
  classificationText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowRadius: 4,
    textShadowOffset: { width: 0, height: 1 },
  },
  advisoryText: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.95)',
    marginTop: 4,
    maxWidth: '65%',
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
