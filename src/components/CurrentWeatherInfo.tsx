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
    <View style={styles.wrapper}>
      <View style={styles.content}>
        <View style={styles.item}>
          <Thermometer size={16} color="#FFFFFF" />
          <Text style={styles.text}>Temperature: {temperature}°C</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.item}>
          <Droplets size={16} color="#FFFFFF" />
          <Text style={styles.text}>Humidity: {humidity}%</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: 14,
    marginTop: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
    backgroundColor: 'rgba(255,255,255,0.22)', // translucent tint — shows the orange gradient through it
  },
  content: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  divider: {
    width: 1,
    height: 18,
    backgroundColor: 'rgba(255,255,255,0.5)',
    marginHorizontal: 20,
  },
  text: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.2)', // helps legibility over the orange gradient
    textShadowRadius: 2,
    textShadowOffset: { width: 0, height: 1 },
  },
});

export default CurrentWeatherInfo;
