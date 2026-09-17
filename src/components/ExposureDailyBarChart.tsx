// src/components/ExposureDailyBarChart.tsx
import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, { Rect, Line, Text as SvgText } from 'react-native-svg';
import { DailyExposureEntry } from '../types/exposure';
import { addHkDays, formatHkDateLabel } from '../utils/hkDate';
import { sumExposureByIo } from '../utils/exposureIoTotals';
import { niceAxisTicks } from '../utils/niceAxisTicks';
import { EXPOSURE_MAP_CONFIG } from '../config/exposureMapConfig';

const SCREEN_WIDTH = Dimensions.get('window').width - 72;
const SVG_HEIGHT = 170;
const PADDING_TOP = 12;
const PADDING_BOTTOM = 26;
const GRAPH_HEIGHT = SVG_HEIGHT - PADDING_TOP - PADDING_BOTTOM;
// Rotated axis-title column + tick-value column to the left of the main
// bar Svg — same side-by-side-Svg convention AqhiHourlyForecastChart/
// DailyHeatForecastCard use for their y-axes, and matches ExposureTrendChart.
const Y_TITLE_WIDTH = 14;
const Y_AXIS_WIDTH = 32;
const CHART_WIDTH = SCREEN_WIDTH - Y_TITLE_WIDTH - Y_AXIS_WIDTH;
// Shared with ExposureTrendChart/ExposureTrajectoryMap so Indoor/Outdoor
// read the same color everywhere in the exposure tab.
const INDOOR_COLOR = EXPOSURE_MAP_CONFIG.indoorColor;
const OUTDOOR_COLOR = EXPOSURE_MAP_CONFIG.outdoorColor;
const EMPTY_BAR_COLOR = '#E5E0FA';
const DIVIDER_COLOR = '#FFFFFF';

type Props = {
  history: DailyExposureEntry[];
  rangeStart: string; // YYYY-MM-DD, HK local, inclusive
  rangeEnd: string; // YYYY-MM-DD, HK local, inclusive
  selectedDate?: string;
  onSelectDay?: (date: string) => void;
  // Today's Indoor/Outdoor split comes from the live useTodayExposure
  // report, not the persisted history (which can lag a tick behind) — this
  // lets that live split override whatever's in `history` for today's slot.
  todayOverride?: { date: string; indoor: number; outdoor: number };
  // Lets the range subtitle read "Today" instead of a bare date when it
  // applies — optional since some callers (e.g. a device workspace with no
  // live tracking) still want plain calendar dates only.
  todayKey?: string;
};

type DayBar = { date: string; label: string; indoor: number; outdoor: number; total: number | null };

// No existing bar-chart precedent in this repo — new, but reuses the same
// Svg/getX/getY/label conventions the hourly line charts already use. Shows
// one bar per day in the given [rangeStart, rangeEnd] range (inclusive),
// rather than a fixed trailing window. Each bar is split Indoor/Outdoor
// (same stacked-bar treatment as ExposureTrendChart's hourly bars) rather
// than one flat total, so the daily and hourly charts read as one
// consistent system. Bars fill their full day slot (no gap) with a thin
// white divider between adjacent bars.
const ExposureDailyBarChart: React.FC<Props> = ({
  history,
  rangeStart,
  rangeEnd,
  selectedDate,
  onSelectDay,
  todayOverride,
  todayKey,
}) => {
  const days = useMemo(() => {
    const byDate = new Map(history.map(entry => [entry.date, entry]));
    const result: DayBar[] = [];
    let cursor = rangeStart;
    while (cursor <= rangeEnd) {
      const entry = byDate.get(cursor);
      const io =
        todayOverride?.date === cursor
          ? { indoor: todayOverride.indoor, outdoor: todayOverride.outdoor }
          : entry
            ? sumExposureByIo(entry.report.segments)
            : null;
      const [, m, d] = cursor.split('-');
      result.push({
        date: cursor,
        label: `${Number(m)}/${Number(d)}`,
        indoor: io?.indoor ?? 0,
        outdoor: io?.outdoor ?? 0,
        total: io ? io.indoor + io.outdoor : null,
      });
      cursor = addHkDays(cursor, 1);
    }
    return result;
  }, [history, rangeStart, rangeEnd, todayOverride]);

  const maxTotal = Math.max(0, ...days.map(d => d.total ?? 0));
  const { ticks, niceMax } = useMemo(() => niceAxisTicks(maxTotal, 4), [maxTotal]);
  const dayCount = Math.max(days.length, 1);
  const slotWidth = CHART_WIDTH / dayCount;
  const barWidth = slotWidth;
  // Sparse ranges skip labels to avoid overlapping text.
  const labelEvery = Math.max(1, Math.ceil(days.length / 12));

  const baseY = PADDING_TOP + GRAPH_HEIGHT;
  const getY = (value: number) => baseY - (value / niceMax) * GRAPH_HEIGHT;
  const getSegmentHeight = (value: number) => (value / niceMax) * GRAPH_HEIGHT;

  return (
    <View>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Daily Exposure</Text>
        <Text style={styles.subtitle}>
          {rangeStart === rangeEnd
            ? formatHkDateLabel(rangeStart, todayKey)
            : `${formatHkDateLabel(rangeStart, todayKey)} – ${formatHkDateLabel(rangeEnd, todayKey)}`}
        </Text>
      </View>
      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: OUTDOOR_COLOR }]} />
          <Text style={styles.legendText}>Outdoor</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: INDOOR_COLOR }]} />
          <Text style={styles.legendText}>Indoor</Text>
        </View>
      </View>
      <View style={styles.axisRow}>
        <View style={styles.yTitleColumn}>
          <Text style={styles.yTitleText} numberOfLines={1}>
            Exposure (%AR·h)
          </Text>
        </View>
        <Svg width={Y_AXIS_WIDTH} height={SVG_HEIGHT}>
          {ticks.map(v => (
            <SvgText
              key={v}
              x={Y_AXIS_WIDTH - 6}
              y={getY(v) + 4}
              fontSize={10}
              fill="#333"
              textAnchor="end"
            >
              {v.toFixed(niceMax < 1 ? 2 : niceMax < 10 ? 1 : 0)}
            </SvgText>
          ))}
        </Svg>
        <Svg width={CHART_WIDTH} height={SVG_HEIGHT}>
          {ticks.map(v => (
            <Line
              key={v}
              x1={0}
              y1={getY(v)}
              x2={CHART_WIDTH}
              y2={getY(v)}
              stroke="#718096"
              strokeOpacity={0.12}
            />
          ))}
          <Line x1={0} y1={baseY} x2={CHART_WIDTH} y2={baseY} stroke="#718096" strokeOpacity={0.25} />
          {days.map((day, i) => {
            const outdoorHeight = getSegmentHeight(day.outdoor);
            const indoorHeight = getSegmentHeight(day.indoor);
            const slotX = i * slotWidth;
            const barX = slotX;
            const outdoorY = baseY - outdoorHeight;
            const indoorY = outdoorY - indoorHeight;
            const isSelected = selectedDate === day.date;
            const opacity = selectedDate && !isSelected ? 0.5 : 1;
            return (
              <React.Fragment key={day.date}>
                {/* Full-column, full-height, invisible hit target so the whole
                    slot is tappable, not just the visible bar sliver. */}
                <Rect
                  x={slotX}
                  y={PADDING_TOP}
                  width={slotWidth}
                  height={GRAPH_HEIGHT}
                  fill="transparent"
                  onPress={() => onSelectDay?.(day.date)}
                />
                {day.total && day.total > 0 ? (
                  <>
                    {day.outdoor > 0 && (
                      <Rect
                        x={barX}
                        y={outdoorY}
                        width={barWidth}
                        height={outdoorHeight}
                        fill={OUTDOOR_COLOR}
                        opacity={opacity}
                      />
                    )}
                    {day.indoor > 0 && (
                      <Rect
                        x={barX}
                        y={indoorY}
                        width={barWidth}
                        height={indoorHeight}
                        fill={INDOOR_COLOR}
                        opacity={opacity}
                      />
                    )}
                  </>
                ) : (
                  <Rect x={barX} y={baseY - 2} width={barWidth} height={2} fill={EMPTY_BAR_COLOR} />
                )}
                {i % labelEvery === 0 && (
                  <SvgText
                    x={slotX + slotWidth / 2}
                    y={SVG_HEIGHT - 8}
                    fontSize={9}
                    fontWeight={isSelected ? '700' : '400'}
                    fill={isSelected ? '#1C1C1E' : '#8E8E93'}
                    textAnchor="middle"
                  >
                    {day.label}
                  </SvgText>
                )}
              </React.Fragment>
            );
          })}
          {/* Thin white seams between touching bars so adjacent days stay
              visually distinct without leaving an actual gap in the strip. */}
          {days.slice(1).map((day, i) => (
            <Line
              key={`divider-${day.date}`}
              x1={(i + 1) * slotWidth}
              y1={PADDING_TOP}
              x2={(i + 1) * slotWidth}
              y2={baseY}
              stroke={DIVIDER_COLOR}
              strokeWidth={1.5}
            />
          ))}
        </Svg>
      </View>
      <Text style={styles.xTitleText}>Date</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  title: { fontSize: 15, fontWeight: '700', color: '#1C1C1E' },
  subtitle: { fontSize: 12, fontWeight: '600', color: '#8E8E93' },
  legendRow: { flexDirection: 'row', gap: 14, marginBottom: 6 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11, color: '#8E8E93' },
  axisRow: { flexDirection: 'row', alignItems: 'flex-start' },
  yTitleColumn: {
    width: Y_TITLE_WIDTH,
    height: GRAPH_HEIGHT,
    marginTop: PADDING_TOP,
    alignItems: 'center',
    justifyContent: 'center',
  },
  yTitleText: {
    width: GRAPH_HEIGHT,
    textAlign: 'center',
    fontSize: 10,
    fontWeight: '600',
    color: '#8E8E93',
    transform: [{ rotate: '-90deg' }],
  },
  xTitleText: {
    width: CHART_WIDTH,
    fontSize: 10,
    fontWeight: '600',
    color: '#8E8E93',
    textAlign: 'center',
    marginTop: 2,
    marginLeft: Y_TITLE_WIDTH + Y_AXIS_WIDTH,
  },
});

export default ExposureDailyBarChart;
