// src/components/DualStatPin.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MapPin } from 'lucide-react-native';
import { getHeatIndexInfo } from '../utils/heatIndexUtils';
import { getAqhiInfo } from '../utils/aqhiUtils';
import { HazardKind } from '../types/alerts';
import { MAP_PLACE_PIN_CONFIG, MAP_POINT_PIN_CONFIG } from '../config/mapLayerConfig';

// null = loading / unavailable
type Props = {
  temperature: number | null; // heat index
  aqhi: number | null;
  // Temp · Humidity context — the tapped point only. Saved places leave
  // both out: that line would cost two more lookups per place.
  airTemperature?: number | null;
  humidity?: number | null;
  // A saved place: its name heads the pill, and a smaller grey pin keeps it
  // apart from the tapped point.
  title?: string;
  // Only this hazard's value — the small Home preview, where two numbers
  // per pin get crowded. Both when omitted.
  only?: HazardKind;
};

// Neutral grey, so a missing value never reads as a heat level color.
const UNAVAILABLE_DOT_COLOR = '#BBBBBB';

const DualStatPin: React.FC<Props> = ({
  temperature,
  airTemperature,
  humidity,
  aqhi,
  title,
  only,
}) => {
  // Same classification colors as the heat card, chart and legend.
  const heatColor =
    temperature === null
      ? UNAVAILABLE_DOT_COLOR
      : getHeatIndexInfo(temperature).color;
  const aqhiColor =
    aqhi === null ? UNAVAILABLE_DOT_COLOR : getAqhiInfo(aqhi).color;
  const showHeat = only !== 'aqhi';
  const showAqhi = only !== 'heat';
  const pin = title === undefined ? MAP_POINT_PIN_CONFIG : MAP_PLACE_PIN_CONFIG;

  return (
    <View style={styles.wrapper}>
      <View style={styles.pill}>
        {title !== undefined && (
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
        )}
        <View style={styles.row}>
          {showHeat && (
            <>
              <View style={[styles.dot, { backgroundColor: heatColor }]} />
              <Text style={styles.text}>Feels Like {temperature ?? '--'}°</Text>
            </>
          )}
          {showHeat && showAqhi && <View style={styles.divider} />}
          {showAqhi && (
            <>
              <View style={[styles.dot, { backgroundColor: aqhiColor }]} />
              <Text style={styles.text}>AQHI {aqhi ?? '--'}</Text>
            </>
          )}
        </View>
        {/* Secondary context only: lets the user compare "feels like" with
            the thermometer at the exact spot they tapped, without a separate
            temperature map layer competing with the heat index one. Always
            rendered for the tapped point ("--" while loading) so the pin's
            height never changes after the marker is drawn — see MapScreen's
            marker key. */}
        {airTemperature !== undefined && (
          <Text style={styles.subText}>
            Temp {airTemperature ?? '--'}° · Humidity {humidity ?? '--'}%
          </Text>
        )}
      </View>

      <MapPin size={pin.iconSize} color={pin.color} fill={pin.color} strokeWidth={1.5} />
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
    maxWidth: 220,
  },
  title: { fontSize: 11, fontWeight: '700', color: '#555' },
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
