// src/components/DailyHeatForecastCard.tsx
import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import Svg, {
  Rect,
  Line,
  Path,
  Circle,
  Text as SvgText,
  Defs,
  ClipPath,
  G,
} from 'react-native-svg';
import { DayForecast } from '../data/forecast/types';
import { generateMockDays } from '../data/forecast/mockForecastProvider';

const SCREEN_WIDTH = Dimensions.get('window').width - 40;
const SVG_HEIGHT = 220;
const Y_AXIS_WIDTH = 35;
const CHART_PADDING_HORIZONTAL = 15;
const PADDING_BOTTOM = 25;
const PADDING_TOP = 15;

const MIN_TEMP = 15;
const MAX_TEMP = 50;

interface Props {
  days?: DayForecast[];
}

const HEAT_ZONES = [
  { min: 43, max: 50, color: '#DF7C8D', label: 'Extremely Hot' },
  { min: 35, max: 43, color: '#E99066', label: 'Very Hot' },
  { min: 28, max: 35, color: '#F0B96D', label: 'Hot' },
  { min: 20, max: 28, color: '#F4D97A', label: 'Very Warm' },
  { min: 15, max: 20, color: '#87C693', label: 'Neutral' },
];

const GRID_LINES = [20, 28, 35, 43, 50];

const DEFAULT_CENTER = { latitude: 22.3375, longitude: 114.263 };

export const DailyHeatForecastCard: React.FC<Props> = ({ days }) => {
  const resolvedDays = useMemo(
    () => days ?? generateMockDays(DEFAULT_CENTER),
    [days],
  );
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const activeDay = resolvedDays[selectedDayIndex];
  const forecastData = activeDay?.points ?? [];

  const currentTimeIndex = useMemo(() => {
    if (!activeDay?.isToday) return undefined;
    const now = Date.now();
    return forecastData.reduce(
      (closestIdx, p, idx) =>
        Math.abs(p.timestamp - now) <
        Math.abs(forecastData[closestIdx].timestamp - now)
          ? idx
          : closestIdx,
      0,
    );
  }, [activeDay, forecastData]);

  const VISIBLE_POINTS = 5;
  const WINDOW_WIDTH = SCREEN_WIDTH - Y_AXIS_WIDTH;
  const VISIBLE_GRAPH_WIDTH = WINDOW_WIDTH - CHART_PADDING_HORIZONTAL * 2;
  const STEP = VISIBLE_GRAPH_WIDTH / (VISIBLE_POINTS - 1);

  const GRAPH_WIDTH = STEP * Math.max(forecastData.length - 1, 1);
  const SCROLL_SVG_WIDTH = GRAPH_WIDTH + CHART_PADDING_HORIZONTAL * 2;
  const GRAPH_HEIGHT = SVG_HEIGHT - PADDING_TOP - PADDING_BOTTOM;

  const getY = (temp: number) => {
    const clampedTemp = Math.min(Math.max(temp, MIN_TEMP), MAX_TEMP);
    const percentage = (clampedTemp - MIN_TEMP) / (MAX_TEMP - MIN_TEMP);
    return PADDING_TOP + GRAPH_HEIGHT - percentage * GRAPH_HEIGHT;
  };

  const getX = (index: number) => CHART_PADDING_HORIZONTAL + index * STEP;

  const getPointColor = (temp: number) => {
    const matchedZone = HEAT_ZONES.find(zone => temp >= zone.min);
    return matchedZone ? matchedZone.color : '#87C693';
  };

  const points = forecastData.map((d, i) => ({
    x: getX(i),
    y: getY(d.heatIndex),
  }));

  const generateSmoothPath = (pts: { x: number; y: number }[]) => {
    const smoothing = 0.2;
    const getCP = (
      current: any,
      previous: any,
      next: any,
      reverse: boolean,
    ) => {
      const p = previous || current;
      const n = next || current;
      const lengthX = n.x - p.x;
      const lengthY = n.y - p.y;
      const angle = Math.atan2(lengthY, lengthX) + (reverse ? Math.PI : 0);
      const length =
        Math.sqrt(Math.pow(lengthX, 2) + Math.pow(lengthY, 2)) * smoothing;
      return {
        x: current.x + Math.cos(angle) * length,
        y: current.y + Math.sin(angle) * length,
      };
    };

    return pts.reduce((acc, point, i, a) => {
      if (i === 0) return `M ${point.x},${point.y}`;
      const cps = getCP(a[i - 1], a[i - 2], point, false);
      const cpe = getCP(point, a[i - 1], a[i + 1], true);
      return `${acc} C ${cps.x},${cps.y} ${cpe.x},${cpe.y} ${point.x},${point.y}`;
    }, '');
  };

  const linePath = generateSmoothPath(points);

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Hourly Heat Index Forecast</Text>

      {/* Day tabs */}
      <View style={styles.dayTabRow}>
        {resolvedDays.map((day, i) => (
          <TouchableOpacity
            key={day.dayLabel + i}
            style={[
              styles.dayTab,
              selectedDayIndex === i && styles.dayTabActive,
            ]}
            onPress={() => setSelectedDayIndex(i)}
          >
            <Text
              style={[
                styles.dayTabText,
                selectedDayIndex === i && styles.dayTabTextActive,
              ]}
            >
              {day.dayLabel}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.chartLayout}>
        <View style={styles.yAxisContainer}>
          <Svg width={Y_AXIS_WIDTH} height={SVG_HEIGHT}>
            {GRID_LINES.map(temp => (
              <SvgText
                key={`grid-label-${temp}`}
                x={Y_AXIS_WIDTH - 6}
                y={getY(temp) + 4}
                fontSize="10"
                fill="#718096"
                textAnchor="end"
              >
                {temp}°
              </SvgText>
            ))}
          </Svg>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          bounces={false}
        >
          <Svg width={SCROLL_SVG_WIDTH} height={SVG_HEIGHT}>
            <Defs>
              <ClipPath id="chartClip">
                <Rect
                  x={0}
                  y={PADDING_TOP}
                  width={SCROLL_SVG_WIDTH}
                  height={GRAPH_HEIGHT}
                  rx={6}
                />
              </ClipPath>
            </Defs>

            <G clipPath="url(#chartClip)">
              {HEAT_ZONES.map((zone, idx) => {
                const yTop = getY(zone.max);
                const yBottom = getY(zone.min);
                return (
                  <Rect
                    key={`zone-${idx}`}
                    x={0}
                    y={yTop}
                    width={SCROLL_SVG_WIDTH}
                    height={yBottom - yTop}
                    fill={zone.color}
                    fillOpacity={0.15}
                  />
                );
              })}
            </G>

            {GRID_LINES.map(temp => (
              <Line
                key={`grid-line-${temp}`}
                x1={0}
                y1={getY(temp)}
                x2={SCROLL_SVG_WIDTH}
                y2={getY(temp)}
                stroke="#A0AEC0"
                strokeDasharray="4,4"
                strokeWidth="1"
              />
            ))}

            <Path
              d={linePath}
              stroke="#5A9E6F"
              strokeWidth="2.5"
              fill="none"
              strokeLinecap="round"
            />

            {forecastData.map((point, index) => (
              <Circle
                key={`point-${index}`}
                cx={getX(index)}
                cy={getY(point.heatIndex)}
                r="4.5"
                fill={getPointColor(point.heatIndex)}
                stroke="#FFFFFF"
                strokeWidth="1.5"
              />
            ))}

            {currentTimeIndex !== undefined &&
              currentTimeIndex < forecastData.length && (
                <Line
                  x1={getX(currentTimeIndex)}
                  y1={PADDING_TOP}
                  x2={getX(currentTimeIndex)}
                  y2={PADDING_TOP + GRAPH_HEIGHT}
                  stroke="#E53E3E"
                  strokeWidth="2.5"
                  strokeDasharray="4,4"
                  strokeLinecap="round"
                />
              )}

            {forecastData.map((point, index) => (
              <SvgText
                key={`x-label-${index}`}
                x={getX(index)}
                y={SVG_HEIGHT - 6}
                fontSize="9"
                fill="#718096"
                textAnchor="middle"
              >
                {point.time}
              </SvgText>
            ))}
          </Svg>
        </ScrollView>
      </View>

      <View style={styles.legendRow}>
        {[...HEAT_ZONES].reverse().map((zone, idx) => (
          <View key={idx} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: zone.color }]} />
            <Text style={styles.legendText}>{zone.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2D3748',
    marginBottom: 10,
  },
  dayTabRow: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 8,
  },
  dayTab: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: '#F0F0F0',
  },
  dayTabActive: {
    backgroundColor: '#E99066',
  },
  dayTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#718096',
  },
  dayTabTextActive: {
    color: '#FFFFFF',
  },
  chartLayout: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  yAxisContainer: {
    width: Y_AXIS_WIDTH,
    height: SVG_HEIGHT,
    backgroundColor: '#FFFFFF',
    zIndex: 10,
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#EDF2F7',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  legendDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  legendText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#4A5568',
  },
});

export default DailyHeatForecastCard;
