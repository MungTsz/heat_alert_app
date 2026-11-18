// src/components/FeelsLikeGapLine.tsx
import React from 'react';
import { Text, StyleSheet, TouchableOpacity } from 'react-native';
import { CircleQuestionMark } from 'lucide-react-native';
import { describeFeelsLikeGap } from '../utils/heatIndexUtils';
import { HEAT_DISPLAY_CONFIG } from '../config/heatDisplayConfig';

type Props = {
  // null = unavailable → no line.
  temperature: number | null;
  heatIndex: number | null;
  // Opens HeatIndexExplainerSheet.
  onPress: () => void;
};

const HIT_SLOP = { top: 8, bottom: 8, left: 8, right: 8 };

// "Humidity makes it feel N° hotter", at the top of the heat forecast
// sheet: the gap between temperature and heat index put into words, which
// is what makes the two numbers click for people new to heat index. Shown
// only when there is a gap — a standing "what is heat index?" link would
// single out heat over AQHI, which has none.
const FeelsLikeGapLine: React.FC<Props> = ({ temperature, heatIndex, onPress }) => {
  const message =
    temperature !== null && heatIndex !== null
      ? describeFeelsLikeGap(temperature, heatIndex, HEAT_DISPLAY_CONFIG.feelsLikeGapMinC)
      : null;
  if (message === null) return null;

  return (
    <TouchableOpacity
      style={styles.line}
      onPress={onPress}
      hitSlop={HIT_SLOP}
      accessibilityRole="button"
      accessibilityHint="Explains what the heat index is"
    >
      <Text style={styles.text}>{message}</Text>
      <CircleQuestionMark size={15} color="#C2410C" />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: '#FFF4E5',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  text: { fontSize: 13, fontWeight: '700', color: '#7C2D12' },
});

export default FeelsLikeGapLine;
