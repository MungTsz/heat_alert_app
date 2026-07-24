// src/screens/HomeScreen.tsx
import React from 'react';
import { StyleSheet, View, Text, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import HeatIndexCard from '../components/HeatIndexCard';
import { useLocation } from '../utils/useLocation';

const HomeScreen = () => {
  const currentTemp = 55;
  const { locationText, loading } = useLocation();

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header Row with Top-Right Location Badge */}
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>Heat Index</Text>

          <View style={styles.locationBadge}>
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.locationText}>📍 {locationText}</Text>
            )}
          </View>
        </View>

        {/* Heat Index Display Card */}
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
    marginBottom: 10,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  locationBadge: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
});

export default HomeScreen;
