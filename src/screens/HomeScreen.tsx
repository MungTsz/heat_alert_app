// src/screens/HomeScreen.tsx
import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MapPin } from 'lucide-react-native';
import TextTicker from 'react-native-text-ticker';
import HeatIndexCard from '../components/HeatIndexCard';
import CurrentWeatherInfo from '../components/CurrentWeatherInfo';
import DailyHeatForecastCard from '../components/DailyHeatForecastCard';
import MapScreen from './MapScreen';
import { useLocation } from '../utils/useLocation';

const LOCATION_BOX_WIDTH = 160;

const HomeScreen = () => {
  // Mock Data
  const heatIndexTemp = 38;
  const actualTemp = 32;
  const currentHumidity = 75;

  const { locationText, loading } = useLocation();

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header Row: Title on Left, Location Ticker on Right */}
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            Heat Index
          </Text>

          <View style={styles.locationContainer}>
            <MapPin size={22} color="#D9534F" style={styles.locationIcon} />

            <View style={styles.locationBox}>
              {loading ? (
                <ActivityIndicator size="small" color="#555" />
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

        {/* 1. Main Current Heat Index Display */}
        <HeatIndexCard temperatureCelsius={heatIndexTemp} />

        {/* 1.5 Supplementary Weather Info (Small Text) */}
        <CurrentWeatherInfo
          temperature={actualTemp}
          humidity={currentHumidity}
        />

        {/* 2. Spatial Thermal Map */}
        <View style={styles.mapContainer}>
          <MapScreen />
        </View>

        {/* 3. Daylight Hours Forecast Chart */}
        <DailyHeatForecastCard />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 80, // <-- Increased to prevent the bottom card from overlapping the floating nav bar
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
    color: '#333',
    flexShrink: 0,
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
    color: '#333',
  },
  mapContainer: {
    height: 380,
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 16,
  },
});

export default HomeScreen;
