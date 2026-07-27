// src/screens/HomeScreen.tsx
import React from 'react';
import { StyleSheet, View, Text, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MapPin } from 'lucide-react-native';
import TextTicker from 'react-native-text-ticker';
import HeatIndexCard from '../components/HeatIndexCard';
import { useLocation } from '../utils/useLocation';

const LOCATION_BOX_WIDTH = 160;

const HomeScreen = () => {
  const currentTemp = 55;
  const { locationText, loading } = useLocation();

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
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
                  duration={16000}
                  loop
                  bounce={false}
                  repeatSpacer={20}
                  marqueeDelay={1500}
                  isInteraction={false}
                >
                  {locationText}
                </TextTicker>
              )}
            </View>
          </View>
        </View>

        <HeatIndexCard temperatureCelsius={currentTemp} />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
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
    width: LOCATION_BOX_WIDTH, // 👈 the "fixed window" you asked for
    height: 24,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  animatingText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
});

export default HomeScreen;
