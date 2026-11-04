// src/components/HourlyForecastChart.tsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  GestureResponderEvent,
  LayoutChangeEvent,
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
import DayTabRow from './DayTabRow';
import ChartBandLegend, { ChartBandLegendItem } from './ChartBandLegend';
import { useSyncedPager } from '../hooks/useSyncedPager';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const SVG_HEIGHT = 240;
const Y_AXIS_WIDTH = 30;
const PADDING_TOP = 8;
const PADDING_BOTTOM = 26;
const GRAPH_HEIGHT = SVG_HEIGHT - PADDING_TOP - PADDING_BOTTOM;
const ACCENT_COLOR = '#F0741F';
const NOW_COLOR = '#0073df';
const PRIMARY_LINE_COLOR = '#888888';
// The secondary series is context, not the headline: a dark slate dash that
// stays readable on every band color but recedes behind the solid line.
const SECONDARY_LINE_COLOR = '#4A5568';
const SECONDARY_LINE_DASH = '4,3';
const LINE_KEY_WIDTH = 16;
// Only the visible day and its neighbours need to stay rendered.
const PAGER_WINDOW_SIZE = 3;

export type ForecastChartPoint = {
  timestamp: number;
  hour: number; // 0-23, HK time — drives the x-axis labels
  value: number;
  secondaryValue?: number | null;
};

export type ForecastChartDay = {
  key: string;
  weekdayShort: string;
  dayOfMonth: number;
  isToday: boolean;
  points: ForecastChartPoint[];
  // The caller decides what "now" means for its data source (latest
  // observed hour for heat, the phone's hour for AQHI); null off today.
  nowIndex: number | null;
};

export type ForecastChartBand = {
  min: number;
  max: number;
  color: string;
  opacity: number;
};

export type ForecastChartSeries = {
  label: string;
  format: (value: number) => string;
};

type Props = {
  days: ForecastChartDay[];
  valueRange: { min: number; max: number };
  yAxisLabels: { value: number; label: string }[];
  bands: ForecastChartBand[];
  legendItems: ChartBandLegendItem[];
  primary: ForecastChartSeries;
  // Optional second line (e.g. temperature under heat index), drawn dashed.
  secondary?: ForecastChartSeries;
  // Still fetching: keeps the empty state from claiming "not available"
  // before the request has even finished.
  loading?: boolean;
};

// Matches the x-axis style used across the app's hourly charts.
const formatHourLabel = (hour24: number): string => {
  if (hour24 === 0) return '12AM';
  if (hour24 === 12) return '12NN';
  if (hour24 < 12) return `${hour24}AM`;
  return `${hour24 - 12}PM`;
};

const peakIndex = (points: ForecastChartPoint[]): number =>
  points.reduce((best, p, i) => (p.value > points[best].value ? i : best), 0);

const LineKey = ({ dashed }: { dashed?: boolean }) => (
  <Svg width={LINE_KEY_WIDTH} height={8}>
    <Line
      x1={0}
      y1={4}
      x2={LINE_KEY_WIDTH}
      y2={4}
      stroke={dashed ? SECONDARY_LINE_COLOR : PRIMARY_LINE_COLOR}
      strokeWidth={dashed ? 1.5 : 2}
      strokeDasharray={dashed ? SECONDARY_LINE_DASH : undefined}
    />
  </Svg>
);

type DayPlotProps = {
  day: ForecastChartDay;
  width: number;
  getY: (value: number) => number;
  bands: ForecastChartBand[];
  hasSecondary: boolean;
  selectedIndex: number | null;
  onSelect: (index: number) => void;
  haloProps: Partial<{ r: number; opacity: number }>;
};

// One day's plot — a page of the swipeable pager. Tapping anywhere selects
// the nearest hour, instead of requiring a hit on a 4px dot.
const DayPlot = React.memo(function DayPlotPage({
  day,
  width,
  getY,
  bands,
  hasSecondary,
  selectedIndex,
  onSelect,
  haloProps,
}: DayPlotProps) {
  const { points, nowIndex } = day;
  const slotWidth = width / Math.max(points.length - 1, 1);
  const getX = (i: number) => i * slotWidth;

  const primaryPath = points.reduce(
    (acc, p, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${getX(i)},${getY(p.value)}`,
    '',
  );
  // Restarts (M) after any hour missing a reading so a gap is never
  // bridged by a made-up straight segment.
  const secondaryPath = hasSecondary
    ? points.reduce((acc, p, i) => {
        if (p.secondaryValue == null) return acc;
        const prev = points[i - 1];
        const cmd = !prev || prev.secondaryValue == null ? 'M' : 'L';
        return `${acc} ${cmd} ${getX(i)},${getY(p.secondaryValue)}`;
      }, '')
    : '';

  const labelIndices = points
    .map((p, i) => ({ hour: p.hour, i }))
    .filter(({ hour }) => hour % 4 === 0)
    .map(({ i }) => i);

  const handlePress = (e: GestureResponderEvent) => {
    if (points.length === 0) return;
    const i = Math.round(e.nativeEvent.locationX / slotWidth);
    onSelect(Math.min(Math.max(i, 0), points.length - 1));
  };

  const clipId = `forecastClip-${day.key}`;
  const selected = selectedIndex !== null ? points[selectedIndex] : null;

  return (
    <Pressable onPress={handlePress} style={{ width }}>
      <Svg width={width} height={SVG_HEIGHT}>
        <Defs>
          <ClipPath id={clipId}>
            <Rect x={0} y={PADDING_TOP} width={width} height={GRAPH_HEIGHT} />
          </ClipPath>
        </Defs>

        <G clipPath={`url(#${clipId})`}>
          {bands.map((band, idx) => (
            <Rect
              key={idx}
              x={0}
              y={getY(band.max)}
              width={width}
              height={getY(band.min) - getY(band.max)}
              fill={band.color}
              opacity={band.opacity}
            />
          ))}

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

          {/* Selected hour: a guide line ties the readout to its column */}
          {selectedIndex !== null && (
            <Line
              x1={getX(selectedIndex)}
              y1={PADDING_TOP}
              x2={getX(selectedIndex)}
              y2={PADDING_TOP + GRAPH_HEIGHT}
              stroke="#2D3748"
              strokeWidth={1}
              opacity={0.5}
            />
          )}
        </G>

        {secondaryPath !== '' && (
          <Path
            d={secondaryPath}
            stroke={SECONDARY_LINE_COLOR}
            strokeWidth={1.5}
            strokeDasharray={SECONDARY_LINE_DASH}
            fill="none"
            strokeLinejoin="round"
          />
        )}

        <Path
          d={primaryPath}
          stroke="#FFFFFF"
          strokeWidth={3}
          fill="none"
          strokeLinejoin="round"
        />
        <Path
          d={primaryPath}
          stroke={PRIMARY_LINE_COLOR}
          strokeWidth={1.5}
          fill="none"
          strokeLinejoin="round"
        />

        {points.map((p, i) => (
          <Circle
            key={`dot-${i}`}
            cx={getX(i)}
            cy={getY(p.value)}
            r={selectedIndex === i ? 6 : 4}
            fill="#FFFFFF"
            stroke={PRIMARY_LINE_COLOR}
            strokeWidth={1.5}
          />
        ))}

        {selected?.secondaryValue != null && selectedIndex !== null && (
          <Circle
            cx={getX(selectedIndex)}
            cy={getY(selected.secondaryValue)}
            r={4}
            fill={SECONDARY_LINE_COLOR}
            stroke="#FFFFFF"
            strokeWidth={1.5}
          />
        )}

        {/* "Now" marker: pulsing halo behind an enlarged solid dot */}
        {nowIndex !== null && (
          <>
            <AnimatedCircle
              cx={getX(nowIndex)}
              cy={getY(points[nowIndex].value)}
              fill={NOW_COLOR}
              animatedProps={haloProps}
            />
            <Circle
              cx={getX(nowIndex)}
              cy={getY(points[nowIndex].value)}
              r={7}
              fill={NOW_COLOR}
              stroke="#FFFFFF"
              strokeWidth={2}
            />
          </>
        )}

        {labelIndices.map(i => {
          // Edge labels are anchored inward so they never render past the
          // chart's left/right bounds and get clipped (e.g. "12AM" at i=0).
          const textAnchor =
            i === 0 ? 'start' : i === points.length - 1 ? 'end' : 'middle';
          return (
            <SvgText
              key={`label-${i}`}
              x={getX(i)}
              y={SVG_HEIGHT - 8}
              fontSize="9"
              fill="#333"
              textAnchor={textAnchor}
            >
              {formatHourLabel(points[i].hour)}
            </SvgText>
          );
        })}
      </Svg>
    </Pressable>
  );
});

// The one hourly forecast chart behind both the heat index and AQHI sheets,
// so the two always share layout and behavior — only the data, bands and
// labels differ. Layout, top to bottom:
//   day tabs → readout (selected hour's values, doubling as the line key) →
//   swipeable day pages (the y-axis stays put; only the plot slides) →
//   one-row band legend.
// The sheet around it carries the title, so the chart has none of its own.
const HourlyForecastChart: React.FC<Props> = ({
  days,
  valueRange,
  yAxisLabels,
  bands,
  legendItems,
  primary,
  secondary,
  loading = false,
}) => {
  const [width, setWidth] = useState(0);
  const graphWidth = Math.max(0, width - Y_AXIS_WIDTH);

  const dayKeys = useMemo(() => days.map(d => d.key), [days]);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const currentKey =
    activeKey !== null && dayKeys.includes(activeKey) ? activeKey : dayKeys[0];
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  // A tab tap and a swipe both land here, so the tabs, pager and readout
  // always agree on the day; the hour selection belongs to the old day.
  const changeDay = useCallback((key: string) => {
    setActiveKey(key);
    setSelectedIndex(null);
  }, []);

  const { listRef, index, onMomentumScrollEnd, getItemLayout } = useSyncedPager(
    dayKeys,
    currentKey ?? '',
    graphWidth,
    changeDay,
  );
  const activeDay = days[index];

  const getY = useCallback(
    (value: number) => {
      const v = Math.min(Math.max(value, valueRange.min), valueRange.max);
      const pct = (v - valueRange.min) / (valueRange.max - valueRange.min);
      return PADDING_TOP + GRAPH_HEIGHT - pct * GRAPH_HEIGHT;
    },
    [valueRange.min, valueRange.max],
  );

  // Drives the pulsing halo behind the "now" dot — loops indefinitely
  const pulseProgress = useSharedValue(0);
  useEffect(() => {
    pulseProgress.value = withRepeat(
      withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [pulseProgress]);
  const haloProps = useAnimatedProps(() => ({
    r: interpolate(pulseProgress.value, [0, 1], [6, 13]),
    opacity: interpolate(pulseProgress.value, [0, 1], [0.45, 0]),
  }));

  // The readout always shows something useful: the tapped hour, else "now"
  // on today, else the day's peak — so a future day opens on its worst hour.
  const focus = useMemo(() => {
    if (!activeDay || activeDay.points.length === 0) return null;
    const i =
      selectedIndex ?? activeDay.nowIndex ?? peakIndex(activeDay.points);
    const hourLabel = formatHourLabel(activeDay.points[i].hour);
    const label =
      selectedIndex !== null
        ? i === activeDay.nowIndex
          ? 'Now'
          : hourLabel
        : activeDay.nowIndex !== null
        ? 'Now'
        : `Peak · ${hourLabel}`;
    return { point: activeDay.points[i], label };
  }, [activeDay, selectedIndex]);

  const onLayout = (e: LayoutChangeEvent) =>
    setWidth(e.nativeEvent.layout.width);

  const dayByKey = useMemo(() => new Map(days.map(d => [d.key, d])), [days]);

  // The pager's items are day keys (what useSyncedPager tracks); each page
  // looks its day up.
  const renderDay = useCallback(
    ({ item }: { item: string }) => (
      <DayPlot
        day={dayByKey.get(item)!}
        width={graphWidth}
        getY={getY}
        bands={bands}
        hasSecondary={!!secondary}
        selectedIndex={item === currentKey ? selectedIndex : null}
        onSelect={setSelectedIndex}
        haloProps={haloProps}
      />
    ),
    [
      dayByKey,
      graphWidth,
      getY,
      bands,
      secondary,
      currentKey,
      selectedIndex,
      haloProps,
    ],
  );

  if (days.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>
          {loading ? 'Loading forecast…' : 'Forecast not available right now.'}
        </Text>
      </View>
    );
  }

  return (
    <View onLayout={onLayout}>
      <DayTabRow
        days={days.map(d => ({
          key: d.key,
          weekdayShort: d.weekdayShort,
          dayOfMonth: d.dayOfMonth,
        }))}
        selectedKey={currentKey}
        onSelect={changeDay}
        accentColor={ACCENT_COLOR}
      />

      {focus && (
        <View style={styles.readout}>
          <View style={styles.readoutTime}>
            <Text style={styles.readoutTimeText}>{focus.label}</Text>
          </View>
          <View style={styles.readoutItem}>
            <LineKey />
            <Text style={styles.readoutLabel}>{primary.label}</Text>
            <Text style={styles.readoutValue}>
              {primary.format(focus.point.value)}
            </Text>
          </View>
          {secondary && (
            <View style={styles.readoutItem}>
              <LineKey dashed />
              <Text style={styles.readoutLabel}>{secondary.label}</Text>
              <Text style={styles.readoutValue}>
                {focus.point.secondaryValue != null
                  ? secondary.format(focus.point.secondaryValue)
                  : '--'}
              </Text>
            </View>
          )}
        </View>
      )}

      {graphWidth > 0 && (
        <View style={styles.chartRow}>
          <Svg width={Y_AXIS_WIDTH} height={SVG_HEIGHT}>
            {yAxisLabels.map(({ value, label }) => (
              <SvgText
                key={value}
                x={Y_AXIS_WIDTH - 6}
                y={getY(value) + 4}
                fontSize="10"
                fill="#333"
                textAnchor="end"
              >
                {label}
              </SvgText>
            ))}
          </Svg>

          <FlatList
            ref={listRef}
            style={{ width: graphWidth }}
            data={dayKeys}
            keyExtractor={item => item}
            renderItem={renderDay}
            extraData={renderDay}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            initialScrollIndex={index}
            getItemLayout={getItemLayout}
            windowSize={PAGER_WINDOW_SIZE}
            onMomentumScrollEnd={onMomentumScrollEnd}
          />
        </View>
      )}

      <ChartBandLegend items={legendItems} />
    </View>
  );
};

const styles = StyleSheet.create({
  readout: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  readoutTime: {
    backgroundColor: '#EDF2F7',
    borderRadius: 10,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  readoutTimeText: { fontSize: 12, fontWeight: '700', color: '#2D3748' },
  readoutItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  readoutLabel: { fontSize: 12, color: '#4A5568', fontWeight: '600' },
  readoutValue: { fontSize: 14, color: '#1A202C', fontWeight: '800' },
  chartRow: { flexDirection: 'row', alignItems: 'flex-start' },
  empty: {
    height: SVG_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: { fontSize: 13, color: '#8E8E93' },
});

export default HourlyForecastChart;
