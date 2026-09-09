// src/components/DailyHeatForecastCard.tsx
import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
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
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withRepeat,
  withTiming,
  interpolate,
  Easing,
} from 'react-native-reanimated';
import { DayForecast } from '../data/forecast/types';
import { HEAT_INDEX_ZONES, fahrenheitToCelsius } from '../utils/heatIndexUtils';
import { clampedChartLabelX, estimateSvgTextWidth } from '../utils/svgChartLabel';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const SCREEN_WIDTH = Dimensions.get('window').width - 72;
const SVG_HEIGHT = 260;
const Y_AXIS_WIDTH = 30;
const PADDING_TOP = 15;
const PADDING_BOTTOM = 30;
const SELECTED_LABEL_FONT_SIZE = 13;

// Chart bounds in Celsius, with headroom below "Safe" and above "Extreme
// Danger" so every zone's band is visible even at the axis edges.
const MIN_TEMP = 15;
const MAX_TEMP = 55;

// Y-axis gridlines sit at each classification boundary (Fahrenheit thresholds
// from HEAT_INDEX_ZONES, converted to Celsius) rather than round numbers, so
// the axis labels line up with where the background bands actually change.
const GRID_TEMPS = HEAT_INDEX_ZONES.slice(0, -1).map(
  z => Math.round(fahrenheitToCelsius(z.minF) * 10) / 10,
);

type Props = { days: DayForecast[] };

const DailyHeatForecastCard: React.FC<Props> = ({ days }) => {
  const [activeDayIndex, setActiveDayIndex] = useState(0);
  const [selectedHourIndex, setSelectedHourIndex] = useState<number | null>(
    null,
  );
  const activeDay = days[activeDayIndex];
  const points = activeDay?.points ?? [];

  const GRAPH_WIDTH = SCREEN_WIDTH - Y_AXIS_WIDTH;
  const GRAPH_HEIGHT = SVG_HEIGHT - PADDING_TOP - PADDING_BOTTOM;
  const slotWidth = GRAPH_WIDTH / Math.max(points.length - 1, 1);

  const getY = (temp: number) => {
    const c = Math.min(Math.max(temp, MIN_TEMP), MAX_TEMP);
    const pct = (c - MIN_TEMP) / (MAX_TEMP - MIN_TEMP);
    return PADDING_TOP + GRAPH_HEIGHT - pct * GRAPH_HEIGHT;
  };
  const getX = (i: number) => i * slotWidth;

  const linePath = useMemo(() => {
    return points.reduce((acc, p, i) => {
      const cmd = i === 0 ? 'M' : 'L';
      return `${acc} ${cmd} ${getX(i)},${getY(p.heatIndex)}`;
    }, '');
  }, [points, slotWidth]);

  // Matches AqhiHourlyForecastChart's label format for a consistent x-axis
  // style across both forecast charts.
  const formatHourLabel = (hour24: number): string => {
    if (hour24 === 0) return '12AM';
    if (hour24 === 12) return '12NN';
    if (hour24 < 12) return `${hour24}AM`;
    return `${hour24 - 12}PM`;
  };

  const labelIndices = points
    .map((p, i) => ({ hour: parseInt(p.time.split(':')[0], 10), i }))
    .filter(({ hour }) => hour % 4 === 0)
    .map(({ i }) => i);

  // "Now" marker — only meaningful on today's tab
  const nowIndex = useMemo(() => {
    if (!activeDay?.isToday) return null;
    const now = Date.now();
    return points.reduce(
      (closestIdx, p, idx) =>
        Math.abs(p.timestamp - now) <
        Math.abs(points[closestIdx].timestamp - now)
          ? idx
          : closestIdx,
      0,
    );
  }, [activeDay, points]);

  // Drives the pulsing halo behind the "now" dot — loops indefinitely
  const pulseProgress = useSharedValue(0);
  useEffect(() => {
    pulseProgress.value = withRepeat(
      withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [pulseProgress]);
  const haloAnimatedProps = useAnimatedProps(() => ({
    r: interpolate(pulseProgress.value, [0, 1], [6, 13]),
    opacity: interpolate(pulseProgress.value, [0, 1], [0.45, 0]),
  }));

  const selectedPoint =
    selectedHourIndex !== null ? points[selectedHourIndex] : null;

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Heat Index</Text>

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
          {GRID_TEMPS.map(temp => (
            <SvgText
              key={temp}
              x={Y_AXIS_WIDTH - 6}
              y={getY(temp) + 4}
              fontSize="10"
              fill="#333"
              textAnchor="end"
            >
              {Math.round(temp)}°
            </SvgText>
          ))}
        </Svg>

        <Svg width={GRAPH_WIDTH} height={SVG_HEIGHT}>
          <Defs>
            <ClipPath id="heatChartClip">
              <Rect
                x={0}
                y={PADDING_TOP}
                width={GRAPH_WIDTH}
                height={GRAPH_HEIGHT}
              />
            </ClipPath>
          </Defs>

          {/* Classification bands, full width, behind everything */}
          <G clipPath="url(#heatChartClip)">
            {HEAT_INDEX_ZONES.map((zone, idx) => {
              const maxC =
                zone.maxF === Infinity
                  ? MAX_TEMP
                  : fahrenheitToCelsius(zone.maxF);
              const minC =
                zone.minF === -Infinity
                  ? MIN_TEMP
                  : fahrenheitToCelsius(zone.minF);
              return (
                <Rect
                  key={idx}
                  x={0}
                  y={getY(maxC)}
                  width={GRAPH_WIDTH}
                  height={getY(minC) - getY(maxC)}
                  fill={zone.color}
                  opacity={0.55}
                />
              );
            })}

            {/* History recedes visually behind the "now" point */}
            {nowIndex !== null && (
              <Rect
                x={0}
                y={PADDING_TOP}
                width={getX(nowIndex)}
                height={GRAPH_HEIGHT}
                fill="#2D3748"
                opacity={0.12}
              />
            )}

            {/* Grid lines tying each x-axis label to its point */}
            {labelIndices.map(i => (
              <Line
                key={`grid-${i}`}
                x1={getX(i)}
                y1={PADDING_TOP}
                x2={getX(i)}
                y2={PADDING_TOP + GRAPH_HEIGHT}
                stroke="#718096"
                strokeWidth={1}
                opacity={0.25}
              />
            ))}
          </G>

          {/* Connecting line, matching the AQHI chart's neutral gray line */}
          <Path
            d={linePath}
            stroke="#FFFFFF"
            strokeWidth={3}
            fill="none"
            strokeLinejoin="round"
          />
          <Path
            d={linePath}
            stroke="#888888"
            strokeWidth={1.5}
            fill="none"
            strokeLinejoin="round"
          />

          {points.map((p, i) => (
            <Circle
              key={`dot-${i}`}
              cx={getX(i)}
              cy={getY(p.heatIndex)}
              r={selectedHourIndex === i ? 6 : 4}
              fill="#FFFFFF"
              stroke="#888888"
              strokeWidth={1.5}
              onPress={() => setSelectedHourIndex(i)}
            />
          ))}

          {/* "Now" marker: pulsing halo behind an enlarged solid dot */}
          {nowIndex !== null && (
            <>
              <AnimatedCircle
                cx={getX(nowIndex)}
                cy={getY(points[nowIndex].heatIndex)}
                fill="#0073df"
                animatedProps={haloAnimatedProps}
              />
              <Circle
                cx={getX(nowIndex)}
                cy={getY(points[nowIndex].heatIndex)}
                r={7}
                fill="#0073df"
                stroke="#FFFFFF"
                strokeWidth={2}
                onPress={() => setSelectedHourIndex(nowIndex)}
              />
            </>
          )}

          {selectedPoint && selectedHourIndex !== null && (() => {
            const labelText = `${Math.round(selectedPoint.heatIndex)}°C`;
            const { x, textAnchor } = clampedChartLabelX(
              getX(selectedHourIndex),
              GRAPH_WIDTH,
              estimateSvgTextWidth(labelText, SELECTED_LABEL_FONT_SIZE),
            );
            return (
              <SvgText
                x={x}
                y={PADDING_TOP - 3}
                fontSize={SELECTED_LABEL_FONT_SIZE}
                fontWeight="bold"
                fill="#d36565"
                textAnchor={textAnchor}
              >
                {labelText}
              </SvgText>
            );
          })()}

          {labelIndices.map(i => {
            const hour24 = parseInt(points[i].time.split(':')[0], 10);
            // Edge labels are anchored inward so they never render past the
            // chart's left/right bounds and get clipped.
            const textAnchor =
              i === 0 ? 'start' : i === points.length - 1 ? 'end' : 'middle';
            return (
              <SvgText
                key={`label-${i}`}
                x={getX(i)}
                y={SVG_HEIGHT - 10}
                fontSize="9"
                fill="#333"
                textAnchor={textAnchor}
              >
                {formatHourLabel(hour24)}
              </SvgText>
            );
          })}
        </Svg>
      </View>

      <View style={styles.legendRow}>
        {[...HEAT_INDEX_ZONES].reverse().map(zone => {
          const rangeLabel =
            zone.minF === -Infinity
              ? `<${Math.round(fahrenheitToCelsius(zone.maxF))}°C`
              : zone.maxF === Infinity
              ? `${Math.round(fahrenheitToCelsius(zone.minF))}°C+`
              : `${Math.round(fahrenheitToCelsius(zone.minF))}-${Math.round(
                  fahrenheitToCelsius(zone.maxF),
                )}°C`;
          return (
            <View key={zone.classification} style={styles.legendItem}>
              <View
                style={[styles.legendSwatch, { backgroundColor: zone.color }]}
              />
              <Text style={styles.legendLabel}>{zone.classification}</Text>
              <Text style={styles.legendRange}>{rangeLabel}</Text>
            </View>
          );
        })}
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
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2D3748',
    marginBottom: 10,
  },
  dayTabRow: {
    flexDirection: 'row',
    gap: 18,
    paddingHorizontal: 4,
    marginBottom: 12,
  },
  dayTab: { alignItems: 'center', gap: 6 },
  weekdayText: { fontSize: 12, fontWeight: '600', color: '#A0AEC0' },
  weekdayTextActive: { color: '#F0741F' },
  dayCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCircleActive: { backgroundColor: '#F0741F' },
  dayNumberText: { fontSize: 16, fontWeight: '700', color: '#2D3748' },
  dayNumberTextActive: { color: '#FFFFFF' },
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
    marginTop: 16,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#EDF2F7',
  },
  legendItem: { alignItems: 'center', width: 68 },
  legendSwatch: { width: 24, height: 14, borderRadius: 2, marginBottom: 3 },
  legendLabel: { fontSize: 9, fontWeight: '700', color: '#333' },
  legendRange: { fontSize: 8, color: '#666', marginTop: 1 },
});

export default DailyHeatForecastCard;
