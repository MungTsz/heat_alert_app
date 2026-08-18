// src/components/DailyHeatForecastCard.tsx
import React, {
  useState,
  useMemo,
  useRef,
  useCallback,
  useEffect,
} from 'react';
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
import { DayForecast, HourlyForecastPoint } from '../data/forecast/types';
import { generateMockDays } from '../data/forecast/mockForecastProvider';

const SCREEN_WIDTH = Dimensions.get('window').width - 40;
const SVG_HEIGHT = 220;
const Y_AXIS_WIDTH = 35;
const CHART_PADDING_HORIZONTAL = 15;
const PADDING_BOTTOM = 25;
const PADDING_TOP = 15;

const MIN_TEMP = 15;
const MAX_TEMP = 50;

const VISIBLE_POINTS = 5; // points visible per screen-width, sets hourly spacing
const EXTEND_THRESHOLD = 200; // px from the right edge that triggers loading another day

interface Props {
  days?: DayForecast[];
  maxDays?: number;
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

// A flattened point, tagged with which day it belongs to and its global
// index in the continuous timeline — what actually gets drawn.
type FlatPoint = HourlyForecastPoint & {
  dayIndex: number;
  globalIndex: number;
};

export const DailyHeatForecastCard: React.FC<Props> = ({
  days,
  maxDays = 3,
}) => {
  const initialDays = useMemo(
    () => (days && days.length > 0 ? days : generateMockDays(DEFAULT_CENTER)),
    [days],
  );
  const [allDays, setAllDays] = useState<DayForecast[]>(initialDays);
  const [activeDayIndex, setActiveDayIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    setAllDays(initialDays);
    setActiveDayIndex(0);
  }, [initialDays]);

  const WINDOW_WIDTH = SCREEN_WIDTH - Y_AXIS_WIDTH;
  const VISIBLE_GRAPH_WIDTH = WINDOW_WIDTH - CHART_PADDING_HORIZONTAL * 2;
  const STEP = VISIBLE_GRAPH_WIDTH / (VISIBLE_POINTS - 1);
  const GRAPH_HEIGHT = SVG_HEIGHT - PADDING_TOP - PADDING_BOTTOM;

  // Flatten every day's points into one continuous timeline, and record the
  // x-position where each day starts (used for divider lines + tab jumps).
  const { flatPoints, dayStartX, dayStartIndex, totalWidth } = useMemo(() => {
    const flat: FlatPoint[] = [];
    const startX: number[] = [];
    const startIdx: number[] = [];
    let globalIndex = 0;

    allDays.forEach((day, dayIdx) => {
      startX.push(CHART_PADDING_HORIZONTAL + globalIndex * STEP);
      startIdx.push(globalIndex);
      day.points.forEach(point => {
        flat.push({ ...point, dayIndex: dayIdx, globalIndex });
        globalIndex += 1;
      });
    });

    const width =
      CHART_PADDING_HORIZONTAL * 2 + Math.max(globalIndex - 1, 1) * STEP;
    return {
      flatPoints: flat,
      dayStartX: startX,
      dayStartIndex: startIdx,
      totalWidth: width,
    };
  }, [allDays, STEP]);

  const getY = (temp: number) => {
    const clampedTemp = Math.min(Math.max(temp, MIN_TEMP), MAX_TEMP);
    const percentage = (clampedTemp - MIN_TEMP) / (MAX_TEMP - MIN_TEMP);
    return PADDING_TOP + GRAPH_HEIGHT - percentage * GRAPH_HEIGHT;
  };

  const getX = (globalIndex: number) =>
    CHART_PADDING_HORIZONTAL + globalIndex * STEP;

  const getPointColor = (temp: number) => {
    const matchedZone = HEAT_ZONES.find(zone => temp >= zone.min);
    return matchedZone ? matchedZone.color : '#87C693';
  };

  const svgPoints = flatPoints.map(p => ({
    x: getX(p.globalIndex),
    y: getY(p.heatIndex),
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

  const linePath = generateSmoothPath(svgPoints);

  // Current-time cursor: only meaningful within today's segment
  const currentTimeGlobalIndex = useMemo(() => {
    const todayIdx = allDays.findIndex(d => d.isToday);
    if (todayIdx === -1) return undefined;
    const todayPoints = flatPoints.filter(p => p.dayIndex === todayIdx);
    if (todayPoints.length === 0) return undefined;

    const now = Date.now();
    return todayPoints.reduce(
      (closest, p) =>
        Math.abs(p.timestamp - now) < Math.abs(closest.timestamp - now)
          ? p
          : closest,
      todayPoints[0],
    ).globalIndex;
  }, [allDays, flatPoints]);

  // Tapping a calendar tab scrolls smoothly to that day's start
  const goToDay = (index: number) => {
    scrollRef.current?.scrollTo({ x: dayStartX[index], animated: true });
    setActiveDayIndex(index);
  };

  // Keeps the top tab strip in sync with whatever day is currently centered
  // in the viewport as the user scrolls, and extends the timeline forward
  // when they approach the right edge.
  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
      const viewportCenter = contentOffset.x + layoutMeasurement.width / 2;

      let nearestDay = 0;
      for (let i = 0; i < dayStartX.length; i++) {
        if (viewportCenter >= dayStartX[i]) nearestDay = i;
      }
      setActiveDayIndex(prev => (prev !== nearestDay ? nearestDay : prev));
    },
    [dayStartX],
  );

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Hourly Heat Index Forecast</Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.dayTabScroll}
      >
        <View style={styles.dayTabRow}>
          {allDays.map((day, i) => {
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

        {/* One continuous scroll — no per-day remount, no flip animation.
            Scrolling right naturally reveals the next day's data. */}
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
              <ClipPath id="chartClip">
                <Rect
                  x={0}
                  y={PADDING_TOP}
                  width={totalWidth}
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
                    width={totalWidth}
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
                x2={totalWidth}
                y2={getY(temp)}
                stroke="#A0AEC0"
                strokeDasharray="4,4"
                strokeWidth="1"
              />
            ))}

            {/* Vertical day-boundary dividers — the "midnight" markers,
                like the reference screenshot's day-separator lines */}
            {dayStartX.slice(1).map((x, i) => (
              <Line
                key={`day-divider-${i}`}
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
              stroke="#5A9E6F"
              strokeWidth="2.5"
              fill="none"
              strokeLinecap="round"
            />

            {flatPoints.map(point => (
              <Circle
                key={`point-${point.globalIndex}`}
                cx={getX(point.globalIndex)}
                cy={getY(point.heatIndex)}
                r="4.5"
                fill={getPointColor(point.heatIndex)}
                stroke="#FFFFFF"
                strokeWidth="1.5"
              />
            ))}

            {currentTimeGlobalIndex !== undefined && (
              <Line
                x1={getX(currentTimeGlobalIndex)}
                y1={PADDING_TOP}
                x2={getX(currentTimeGlobalIndex)}
                y2={PADDING_TOP + GRAPH_HEIGHT}
                stroke="#E53E3E"
                strokeWidth="2.5"
                strokeDasharray="4,4"
                strokeLinecap="round"
              />
            )}

            {flatPoints.map(point => (
              <SvgText
                key={`x-label-${point.globalIndex}`}
                x={getX(point.globalIndex)}
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
  dayTabScroll: {
    marginBottom: 14,
  },
  dayTabRow: {
    flexDirection: 'row',
    gap: 18,
    paddingHorizontal: 4,
  },
  dayTab: {
    alignItems: 'center',
    gap: 6,
  },
  weekdayText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#A0AEC0',
  },
  weekdayTextActive: {
    color: '#E99066',
  },
  dayCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCircleActive: {
    backgroundColor: '#E99066',
  },
  dayNumberText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2D3748',
  },
  dayNumberTextActive: {
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
