// src/components/AqhiHourlyForecastChart.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import Svg, { Rect, Line, Text as SvgText } from 'react-native-svg';
import { AqhiDayForecast } from '../data/aqhiForecast/types';
import { getAqhiInfo, formatAqhiValue } from '../utils/aqhiUtils';

const SCREEN_WIDTH = Dimensions.get('window').width - 72;
const SVG_HEIGHT = 220;
const Y_AXIS_WIDTH = 22;
const PADDING_TOP = 30; // extra room for the tap-tooltip
const PADDING_BOTTOM = 25;
const MIN_AQHI = 1;
const MAX_AQHI = 10;

type Props = { days: AqhiDayForecast[] };

const AqhiHourlyForecastChart: React.FC<Props> = ({ days }) => {
  const [activeDayIndex, setActiveDayIndex] = useState(0);
  const [selectedHourIndex, setSelectedHourIndex] = useState<number | null>(
    null,
  );
  const activeDay = days[activeDayIndex];
  const points = activeDay?.points ?? [];

  const GRAPH_WIDTH = SCREEN_WIDTH - Y_AXIS_WIDTH;
  const GRAPH_HEIGHT = SVG_HEIGHT - PADDING_TOP - PADDING_BOTTOM;
  // Bars always fill the exact available width — no fixed per-hour spacing,
  // so a day with fewer points still spans edge-to-edge, no empty gap.
  const slotWidth = GRAPH_WIDTH / Math.max(points.length, 1);
  const barWidth = slotWidth * 0.6;

  const getY = (val: number) => {
    const c = Math.min(Math.max(val, MIN_AQHI), MAX_AQHI);
    const pct = (c - MIN_AQHI) / (MAX_AQHI - MIN_AQHI);
    return PADDING_TOP + GRAPH_HEIGHT - pct * GRAPH_HEIGHT;
  };
  const getBarX = (i: number) => i * slotWidth + (slotWidth - barWidth) / 2;

  const gridValues = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const selectedPoint =
    selectedHourIndex !== null ? points[selectedHourIndex] : null;

  return (
    <View>
      <View style={styles.dayTabRow}>
        {days.map((day, i) => {
          const isSelected = activeDayIndex === i;
          return (
            <TouchableOpacity
              key={day.dateMs}
              style={styles.dayTab}
              onPress={() => {
                setActiveDayIndex(i);
                setSelectedHourIndex(null);
              }}
            >
              <Text
                style={[
                  styles.weekdayText,
                  isSelected && styles.weekdayTextActive,
                ]}
              >
                {day.weekdayShort}
              </Text>
              <View
                style={[styles.dayCircle, isSelected && styles.dayCircleActive]}
              >
                <Text
                  style={[
                    styles.dayNumberText,
                    isSelected && styles.dayNumberTextActive,
                  ]}
                >
                  {day.dayOfMonth}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
        <Svg width={Y_AXIS_WIDTH} height={SVG_HEIGHT}>
          {gridValues.map(v => (
            <SvgText
              key={v}
              x={Y_AXIS_WIDTH - 6}
              y={getY(v) + 4}
              fontSize="10"
              fill="#718096"
              textAnchor="end"
            >
              {v}
            </SvgText>
          ))}
        </Svg>

        <Svg width={GRAPH_WIDTH} height={SVG_HEIGHT}>
          {gridValues.map(v => (
            <Line
              key={v}
              x1={0}
              y1={getY(v)}
              x2={GRAPH_WIDTH}
              y2={getY(v)}
              stroke="#E2E8F0"
              strokeWidth="1"
            />
          ))}

          {points.map((p, i) => {
            const { color } = getAqhiInfo(p.aqhi);
            const barTop = getY(p.aqhi);
            const barBottom = getY(MIN_AQHI);
            const isSelected = selectedHourIndex === i;
            return (
              <Rect
                key={`bar-${i}`}
                x={getBarX(i)}
                y={barTop}
                width={barWidth}
                height={Math.max(barBottom - barTop, 2)}
                fill={color}
                stroke={isSelected ? '#333' : 'none'}
                strokeWidth={isSelected ? 1.5 : 0}
                rx={2}
                onPress={() => setSelectedHourIndex(i)}
              />
            );
          })}

          {/* Tooltip: shows the exact value above the tapped bar */}
          {selectedPoint && selectedHourIndex !== null && (
            <SvgText
              x={getBarX(selectedHourIndex) + barWidth / 2}
              y={getY(selectedPoint.aqhi) - 8}
              fontSize="12"
              fontWeight="bold"
              fill="#222"
              textAnchor="middle"
            >
              {formatAqhiValue(selectedPoint.aqhi)}
            </SvgText>
          )}

          {points.map((p, i) => (
            <SvgText
              key={`t-${i}`}
              x={getBarX(i) + barWidth / 2}
              y={SVG_HEIGHT - 6}
              fontSize="9"
              fill="#718096"
              textAnchor="middle"
            >
              {p.time}
            </SvgText>
          ))}
        </Svg>
      </View>

      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#4CAF33' }]} />
          <Text style={styles.legendText}>Low</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#F2E500' }]} />
          <Text style={styles.legendText}>Moderate</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#F79420' }]} />
          <Text style={styles.legendText}>Moderate</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#E8242A' }]} />
          <Text style={styles.legendText}>High</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#8D4A3C' }]} />
          <Text style={styles.legendText}>Very High</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#000000' }]} />
          <Text style={styles.legendText}>Serious</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  dayTabRow: {
    flexDirection: 'row',
    gap: 18,
    paddingHorizontal: 4,
    marginBottom: 12,
  },
  dayTab: { alignItems: 'center', gap: 6 },
  weekdayText: { fontSize: 12, fontWeight: '600', color: '#A0AEC0' },
  weekdayTextActive: { color: '#E99066' },
  dayCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCircleActive: { backgroundColor: '#E99066' },
  dayNumberText: { fontSize: 16, fontWeight: '700', color: '#2D3748' },
  dayNumberTextActive: { color: '#FFFFFF' },
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#EDF2F7',
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  legendDot: { width: 7, height: 7, borderRadius: 3.5 },
  legendText: { fontSize: 9, fontWeight: '600', color: '#4A5568' },
});

export default AqhiHourlyForecastChart;
