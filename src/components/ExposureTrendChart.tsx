// src/components/ExposureTrendChart.tsx
import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, { Rect, Line, Text as SvgText } from 'react-native-svg';
import { ExposureSegmentResult } from '../types/exposure';
import { bucketExposureByHour } from '../utils/exposureHourlyBuckets';

const SCREEN_WIDTH = Dimensions.get('window').width - 72;
const SVG_HEIGHT = 160;
const PADDING_TOP = 26;
const PADDING_BOTTOM = 26;
const GRAPH_HEIGHT = SVG_HEIGHT - PADDING_TOP - PADDING_BOTTOM;
const MAX_BAR_WIDTH = 14;
const BAR_COLOR = '#8B5CF6';
const EMPTY_BAR_COLOR = '#E5E0FA';

type Props = {
  segments: ExposureSegmentResult[];
};

// One bar per hour-of-day (0-23, HK local), summing that hour's exposure —
// reuses the same Svg/Rect/Line/SvgText/tap-to-select conventions as
// ExposureDailyBarChart for visual consistency between the two exposure
// charts, just bucketed by hour instead of by calendar day.
const ExposureTrendChart: React.FC<Props> = ({ segments }) => {
  const [selectedHour, setSelectedHour] = useState<number | null>(null);

  const hours = useMemo(() => bucketExposureByHour(segments), [segments]);
  const maxTotal = Math.max(1, ...hours.map(h => h.total));
  const slotWidth = SCREEN_WIDTH / 24;
  const barWidth = Math.min(slotWidth * 0.6, MAX_BAR_WIDTH);
  const labelEvery = 4; // matches AqhiHourlyForecastChart's 4-hour label spacing

  const getBarHeight = (total: number) =>
    total > 0 ? (total / maxTotal) * GRAPH_HEIGHT : 2;

  const selected = selectedHour !== null ? hours[selectedHour] : null;

  if (hours.every(h => h.total === 0)) return null;

  return (
    <View>
      <Text style={styles.title}>Exposure by hour</Text>
      <Svg width={SCREEN_WIDTH} height={SVG_HEIGHT}>
        <Line
          x1={0}
          y1={PADDING_TOP + GRAPH_HEIGHT}
          x2={SCREEN_WIDTH}
          y2={PADDING_TOP + GRAPH_HEIGHT}
          stroke="#718096"
          strokeOpacity={0.25}
        />
        {hours.map(h => {
          const height = getBarHeight(h.total);
          const slotX = h.hour * slotWidth;
          const barX = slotX + (slotWidth - barWidth) / 2;
          const barY = PADDING_TOP + GRAPH_HEIGHT - height;
          const isSelected = selectedHour === h.hour;
          return (
            <React.Fragment key={h.hour}>
              <Rect
                x={slotX}
                y={PADDING_TOP}
                width={slotWidth}
                height={GRAPH_HEIGHT}
                fill="transparent"
                onPress={() => setSelectedHour(selectedHour === h.hour ? null : h.hour)}
              />
              <Rect
                x={barX}
                y={barY}
                width={barWidth}
                height={height}
                rx={3}
                fill={h.total > 0 ? BAR_COLOR : EMPTY_BAR_COLOR}
                opacity={selectedHour !== null && !isSelected ? 0.5 : 1}
              />
              {h.hour % labelEvery === 0 && (
                <SvgText
                  x={slotX + slotWidth / 2}
                  y={SVG_HEIGHT - 8}
                  fontSize={9}
                  fontWeight={isSelected ? '700' : '400'}
                  fill={isSelected ? BAR_COLOR : '#8E8E93'}
                  textAnchor="middle"
                >
                  {h.label}
                </SvgText>
              )}
            </React.Fragment>
          );
        })}
        {selected && selected.total > 0 && (
          <SvgText
            x={selected.hour * slotWidth + slotWidth / 2}
            y={Math.max(PADDING_TOP + GRAPH_HEIGHT - getBarHeight(selected.total) - 8, 12)}
            fontSize={11}
            fontWeight="700"
            fill={BAR_COLOR}
            textAnchor="middle"
          >
            {`${selected.label}  ${selected.total.toFixed(2)}`}
          </SvgText>
        )}
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  title: { fontSize: 13, fontWeight: '700', color: '#1C1C1E', marginBottom: 4 },
});

export default ExposureTrendChart;
