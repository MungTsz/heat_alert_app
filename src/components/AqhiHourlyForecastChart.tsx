// src/components/AqhiHourlyForecastChart.tsx
import React, { useState, useMemo, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  ScrollView,
  TouchableOpacity,
  NativeSyntheticEvent,
  NativeScrollEvent,
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
import { AqhiDayForecast, HourlyAqhiPoint } from '../data/aqhiForecast/types';

const SCREEN_WIDTH = Dimensions.get('window').width - 72;
const SVG_HEIGHT = 200;
const Y_AXIS_WIDTH = 28;
const CHART_PADDING_HORIZONTAL = 15;
const PADDING_BOTTOM = 25;
const PADDING_TOP = 15;
const MIN_AQHI = 1;
const MAX_AQHI = 11;
const VISIBLE_POINTS = 5;

const AQHI_ZONES = [
  { min: 8, max: 11, color: '#D9534F', label: 'Very High' },
  { min: 7, max: 8, color: '#E99066', label: 'High' },
  { min: 4, max: 7, color: '#F4D97A', label: 'Moderate' },
  { min: 1, max: 4, color: '#87C693', label: 'Low' },
];
const GRID_LINES = [1, 4, 7, 8, 11];

type Props = { days: AqhiDayForecast[] };
type FlatPoint = HourlyAqhiPoint & { dayIndex: number; globalIndex: number };

const AqhiHourlyForecastChart: React.FC<Props> = ({ days }) => {
  const [activeDayIndex, setActiveDayIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  const WINDOW_WIDTH = SCREEN_WIDTH - Y_AXIS_WIDTH;
  const VISIBLE_GRAPH_WIDTH = WINDOW_WIDTH - CHART_PADDING_HORIZONTAL * 2;
  const STEP = VISIBLE_GRAPH_WIDTH / (VISIBLE_POINTS - 1);
  const GRAPH_HEIGHT = SVG_HEIGHT - PADDING_TOP - PADDING_BOTTOM;

  const { flatPoints, dayStartX, totalWidth } = useMemo(() => {
    const flat: FlatPoint[] = [];
    const startX: number[] = [];
    let globalIndex = 0;
    days.forEach((day, dayIdx) => {
      startX.push(CHART_PADDING_HORIZONTAL + globalIndex * STEP);
      day.points.forEach(point => {
        flat.push({ ...point, dayIndex: dayIdx, globalIndex });
        globalIndex += 1;
      });
    });
    const width =
      CHART_PADDING_HORIZONTAL * 2 + Math.max(globalIndex - 1, 1) * STEP;
    return { flatPoints: flat, dayStartX: startX, totalWidth: width };
  }, [days, STEP]);

  const getY = (val: number) => {
    const c = Math.min(Math.max(val, MIN_AQHI), MAX_AQHI);
    const pct = (c - MIN_AQHI) / (MAX_AQHI - MIN_AQHI);
    return PADDING_TOP + GRAPH_HEIGHT - pct * GRAPH_HEIGHT;
  };
  const getX = (i: number) => CHART_PADDING_HORIZONTAL + i * STEP;
  const getColor = (val: number) =>
    (AQHI_ZONES.find(z => val >= z.min) ?? AQHI_ZONES[AQHI_ZONES.length - 1])
      .color;

  const svgPoints = flatPoints.map(p => ({
    x: getX(p.globalIndex),
    y: getY(p.aqhi),
  }));
  const linePath = useMemo(() => {
    const smoothing = 0.2;
    const getCP = (
      current: any,
      previous: any,
      next: any,
      reverse: boolean,
    ) => {
      const p = previous || current,
        n = next || current;
      const lengthX = n.x - p.x,
        lengthY = n.y - p.y;
      const angle = Math.atan2(lengthY, lengthX) + (reverse ? Math.PI : 0);
      const length = Math.sqrt(lengthX ** 2 + lengthY ** 2) * smoothing;
      return {
        x: current.x + Math.cos(angle) * length,
        y: current.y + Math.sin(angle) * length,
      };
    };
    return svgPoints.reduce((acc, point, i, a) => {
      if (i === 0) return `M ${point.x},${point.y}`;
      const cps = getCP(a[i - 1], a[i - 2], point, false);
      const cpe = getCP(point, a[i - 1], a[i + 1], true);
      return `${acc} C ${cps.x},${cps.y} ${cpe.x},${cpe.y} ${point.x},${point.y}`;
    }, '');
  }, [svgPoints]);

  const goToDay = (index: number) => {
    scrollRef.current?.scrollTo({ x: dayStartX[index], animated: true });
    setActiveDayIndex(index);
  };

  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset, layoutMeasurement } = e.nativeEvent;
      const center = contentOffset.x + layoutMeasurement.width / 2;
      let nearest = 0;
      for (let i = 0; i < dayStartX.length; i++)
        if (center >= dayStartX[i]) nearest = i;
      setActiveDayIndex(prev => (prev !== nearest ? nearest : prev));
    },
    [dayStartX],
  );

  return (
    <View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginBottom: 12 }}
      >
        <View style={styles.dayTabRow}>
          {days.map((day, i) => {
            const isSelected = activeDayIndex === i;
            return (
              <TouchableOpacity
                key={day.dateMs}
                style={styles.dayTab}
                onPress={() => goToDay(i)}
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
                  style={[
                    styles.dayCircle,
                    isSelected && styles.dayCircleActive,
                  ]}
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
      </ScrollView>

      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Svg width={Y_AXIS_WIDTH} height={SVG_HEIGHT}>
          {GRID_LINES.map(v => (
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

        <ScrollView
          ref={scrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          bounces={false}
          onScroll={handleScroll}
          scrollEventThrottle={100}
        >
          <Svg width={totalWidth} height={SVG_HEIGHT}>
            <Defs>
              <ClipPath id="aqhiClip">
                <Rect
                  x={0}
                  y={PADDING_TOP}
                  width={totalWidth}
                  height={GRAPH_HEIGHT}
                  rx={6}
                />
              </ClipPath>
            </Defs>
            <G clipPath="url(#aqhiClip)">
              {AQHI_ZONES.map((zone, idx) => (
                <Rect
                  key={idx}
                  x={0}
                  y={getY(zone.max)}
                  width={totalWidth}
                  height={getY(zone.min) - getY(zone.max)}
                  fill={zone.color}
                  fillOpacity={0.15}
                />
              ))}
            </G>
            {GRID_LINES.map(v => (
              <Line
                key={v}
                x1={0}
                y1={getY(v)}
                x2={totalWidth}
                y2={getY(v)}
                stroke="#A0AEC0"
                strokeDasharray="4,4"
                strokeWidth="1"
              />
            ))}
            {dayStartX.slice(1).map((x, i) => (
              <Line
                key={i}
                x1={x - STEP / 2}
                y1={PADDING_TOP}
                x2={x - STEP / 2}
                y2={PADDING_TOP + GRAPH_HEIGHT}
                stroke="#CBD5E0"
                strokeWidth="1"
              />
            ))}
            <Path
              d={linePath}
              stroke="#5A7DAA"
              strokeWidth="2.5"
              fill="none"
              strokeLinecap="round"
            />
            {flatPoints.map(p => (
              <Circle
                key={p.globalIndex}
                cx={getX(p.globalIndex)}
                cy={getY(p.aqhi)}
                r="4.5"
                fill={getColor(p.aqhi)}
                stroke="#FFFFFF"
                strokeWidth="1.5"
              />
            ))}
            {flatPoints.map(p => (
              <SvgText
                key={`t-${p.globalIndex}`}
                x={getX(p.globalIndex)}
                y={SVG_HEIGHT - 6}
                fontSize="9"
                fill="#718096"
                textAnchor="middle"
              >
                {p.time}
              </SvgText>
            ))}
          </Svg>
        </ScrollView>
      </View>

      <View style={styles.legendRow}>
        {AQHI_ZONES.map((zone, idx) => (
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
  dayTabRow: { flexDirection: 'row', gap: 18, paddingHorizontal: 4 },
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
    justifyContent: 'space-around',
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
