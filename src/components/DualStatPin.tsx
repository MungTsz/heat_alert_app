// src/components/DualStatPin.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MapPin } from 'lucide-react-native';
import { getHeatIndexInfo } from '../utils/heatIndexUtils';
import { getAqhiInfo } from '../utils/aqhiUtils';

// null = loading / unavailable
type Props = {
  temperature: number | null; // heat index
  airTemperature: number | null;
  humidity: number | null;
  aqhi: number | null;
};

// Neutral grey, so a missing value never reads as a heat level color.
const UNAVAILABLE_DOT_COLOR = '#BBBBBB';

const DualStatPin: React.FC<Props> = ({
  temperature,
  airTemperature,
  humidity,
  aqhi,
}) => {
  // Same classification colors as the heat card, chart and legend.
  const heatColor =
    temperature === null
      ? UNAVAILABLE_DOT_COLOR
      : getHeatIndexInfo(temperature).color;
  const aqhiColor =
    aqhi === null ? UNAVAILABLE_DOT_COLOR : getAqhiInfo(aqhi).color;

  return (
    <View style={styles.wrapper}>
      <View style={styles.pill}>
        <View style={styles.row}>
          <View style={[styles.dot, { backgroundColor: heatColor }]} />
          <Text style={styles.text}>Feels Like {temperature ?? '--'}°</Text>
          <View style={styles.divider} />
          <View style={[styles.dot, { backgroundColor: aqhiColor }]} />
          <Text style={styles.text}>AQHI {aqhi ?? '--'}</Text>
        </View>
        {/* Secondary context only: lets the user compare "feels like" with
            the thermometer at the exact spot they tapped, without a separate
            temperature map layer competing with the heat index one. Always
            rendered ("--" while loading) so the pin's height never changes
            after the marker is drawn — see MapScreen's marker key. */}
        <Text style={styles.subText}>
          Temp {airTemperature ?? '--'}° · Humidity {humidity ?? '--'}%
        </Text>
      </View>

      <MapPin size={42} color="#2B7A9E" fill="#2B7A9E" strokeWidth={1.5} />
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: { alignItems: 'center' },
  pill: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: 0.5,
    borderColor: '#E2E2E2',
    gap: 2,
    marginBottom: 2,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  divider: {
    width: 0.5,
    height: 14,
    backgroundColor: '#DDD',
    marginHorizontal: 2,
  },
  text: { fontSize: 12, fontWeight: '700', color: '#222' },
  subText: { fontSize: 11, fontWeight: '500', color: '#666' },
});

export default DualStatPin;
