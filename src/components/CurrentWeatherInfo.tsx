// src/components/CurrentWeatherInfo.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Thermometer, Droplets } from 'lucide-react-native';

interface Props {
  temperature: number;
  humidity: number;
}

const CurrentWeatherInfo: React.FC<Props> = ({ temperature, humidity }) => {
  return (
    <View style={styles.blockContainer}>
      <View style={styles.item}>
        <Thermometer size={16} color="#718096" />
        <Text style={styles.text}>Temp: {temperature}°C</Text>
      </View>

      <View style={styles.divider} />

      <View style={styles.item}>
        <Droplets size={16} color="#718096" />
        <Text style={styles.text}>Humidity: {humidity}%</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  blockContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.4)', // Soft translucent fill
    borderWidth: 1,
    borderColor: 'rgba(144, 183, 235, 0.7)', // Subtle border outline
    borderRadius: 14,
    marginTop: 12,
    paddingVertical: 12, // Increased vertical padding for a bigger block feel
    paddingHorizontal: 24, // Increased horizontal padding
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  divider: {
    width: 1,
    height: 18, // Taller divider to match increased size
    backgroundColor: '#CBD5E0',
    marginHorizontal: 20,
  },
  text: {
    fontSize: 14, // Slightly larger text, still secondary to the main card
    fontWeight: '500',
    color: '#718096',
  },
});

export default CurrentWeatherInfo;
