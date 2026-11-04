// src/components/CurrentWeatherInfo.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Thermometer, Droplets, CircleQuestionMark } from 'lucide-react-native';
import { glassCardStyle, glassLabelText } from '../styles/glassCard';
import { describeFeelsLikeGap } from '../utils/heatIndexUtils';
import { HEAT_DISPLAY_CONFIG } from '../config/heatDisplayConfig';

// null = not loaded / unavailable, shown as "--" rather than a fake 0.
interface Props {
  temperature: number | null;
  humidity: number | null;
  heatIndex: number | null;
  onPressInfo: () => void;
}

const INFO_HIT_SLOP = { top: 8, bottom: 8, left: 8, right: 8 };

// Air temperature and humidity are the supporting context under the
// heat index card, not a headline of their own: the footer line puts the
// gap between "air" and "feels like" into words, which is what makes the
// difference between the two numbers click for people new to heat index.
const CurrentWeatherInfo: React.FC<Props> = ({
  temperature,
  humidity,
  heatIndex,
  onPressInfo,
}) => {
  const gapMessage =
    temperature !== null && heatIndex !== null
      ? describeFeelsLikeGap(
          temperature,
          heatIndex,
          HEAT_DISPLAY_CONFIG.feelsLikeGapMinC,
        )
      : null;

  return (
    <View style={styles.wrapper}>
      <View style={styles.row}>
        <View style={styles.item}>
          <Thermometer size={16} color="#FFFFFF" />
          <Text style={styles.text}>Temp: {temperature ?? '--'}°C</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.item}>
          <Droplets size={16} color="#FFFFFF" />
          <Text style={styles.text}>Humidity: {humidity ?? '--'}%</Text>
        </View>
      </View>

      {/* Only when there's an actual gap to explain. A standing "what is
          the heat index?" link would single out heat over AQHI, which has no
          such link; this line appears only in the case that needs it. */}
      {gapMessage !== null && (
        <TouchableOpacity
          style={styles.footer}
          onPress={onPressInfo}
          hitSlop={INFO_HIT_SLOP}
          accessibilityLabel="What is the heat index?"
        >
          <Text style={styles.footerText}>{gapMessage}</Text>
          <CircleQuestionMark size={15} color="#FFFFFF" />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    ...glassCardStyle,
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
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
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(255,255,255,0.3)',
  },
  footerText: {
    fontSize: 13,
    fontWeight: '700',
    ...glassLabelText,
  },
});

export default CurrentWeatherInfo;
