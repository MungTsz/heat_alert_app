// src/components/CurrentWeatherInfo.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Thermometer, Droplets } from 'lucide-react-native';
import { glassCardStyle, glassLabelText } from '../styles/glassCard';

interface Props {
  temperature: number;
  humidity: number;
}

const CurrentWeatherInfo: React.FC<Props> = ({ temperature, humidity }) => {
  return (
    <View style={styles.wrapper}>
      <View style={styles.item}>
        <Thermometer size={16} color="#FFFFFF" />
        <Text style={styles.text}>Temp: {temperature}°C</Text>
      </View>
      <View style={styles.divider} />
      <View style={styles.item}>
        <Droplets size={16} color="#FFFFFF" />
        <Text style={styles.text}>Humidity: {humidity}%</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    ...glassCardStyle,
    marginTop: 12,
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
    backgroundColor: 'rgba(255,255,255,0.3)',
    marginHorizontal: 20,
  },
  text: {
    fontSize: 14,
    fontWeight: '500',
    ...glassLabelText,
  },
});

export default CurrentWeatherInfo;
