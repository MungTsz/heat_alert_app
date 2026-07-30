// src/components/HeatIndexCard.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { getHeatIndexInfo } from '../utils/heatIndexUtils';

interface HeatIndexCardProps {
  temperatureCelsius: number;
}

const HeatIndexCard: React.FC<HeatIndexCardProps> = ({
  temperatureCelsius,
}) => {
  const { classification, color, risk } = getHeatIndexInfo(temperatureCelsius);

  return (
    <View style={[styles.cardContainer, { backgroundColor: color }]}>
      <Text style={styles.titleText}>Feels Like...</Text>
      <Text style={styles.temperatureText}>{temperatureCelsius}°C</Text>
      <View style={styles.divider} />
      <Text style={styles.classificationText}>{classification}</Text>
      <Text style={styles.riskText}>{risk}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 16,
  },
  titleText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  temperatureText: {
    fontSize: 72,
    fontWeight: 'bold',
    color: '#111',
  },
  divider: {
    height: 1,
    width: '80%',
    backgroundColor: 'rgba(0,0,0,0.2)',
    marginVertical: 12,
  },
  classificationText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#222',
    marginBottom: 4,
  },
  riskText: {
    fontSize: 14,
    color: '#444',
    textAlign: 'center',
  },
});

export default HeatIndexCard;
