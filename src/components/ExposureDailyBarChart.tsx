// src/components/ExposureDailyBarChart.tsx
import React, { useMemo, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions, ScrollView, Pressable } from 'react-native';
import Svg, { Rect, Line, Text as SvgText } from 'react-native-svg';
import { DailyExposureEntry, EXPOSURE_IO_TYPES, ExposureIo } from '../types/exposure';
import { addHkDays, formatHkDateLabel } from '../utils/hkDate';
import { formatIoBreakdown, sumExposureByIo } from '../utils/exposureIoTotals';
import { niceAxisTicks } from '../utils/niceAxisTicks';
import { pickAxisLabelStride } from '../utils/chartAxisLabels';
import { clampedChartLabelX, estimateSvgTextWidth } from '../utils/svgChartLabel';
import { EXPOSURE_MAP_CONFIG } from '../config/exposureMapConfig';
import { EXPOSURE_IO_CONFIG } from '../config/exposureIoConfig';

const SCREEN_WIDTH = Dimensions.get('window').width - 72;
const SVG_HEIGHT = 170;
const PADDING_TOP = 26;
const PADDING_BOTTOM = 26;
const GRAPH_HEIGHT = SVG_HEIGHT - PADDING_TOP - PADDING_BOTTOM;
// Rotated axis-title column + tick-value column to the left of the main
// bar Svg — same side-by-side-Svg convention AqhiHourlyForecastChart/
// DailyHeatForecastCard use for their y-axes, and matches ExposureTrendChart.
const Y_TITLE_WIDTH = 14;
const Y_AXIS_WIDTH = 32;
const CHART_WIDTH = SCREEN_WIDTH - Y_TITLE_WIDTH - Y_AXIS_WIDTH;
// Floor so a 1-2 day range doesn't render one giant bar, and a cap so bars
// never get thinner than a 30-day-wide window — past that, the rest scrolls
// instead of shrinking further (mirrors the hourly chart's fixed 24-bar page).
const MIN_VISIBLE_DAY_BARS = 3;
const MAX_VISIBLE_DAY_BARS = 30;
const SELECTED_LABEL_FONT_SIZE = 11; // matches ExposureTrendChart
const EMPTY_BAR_COLOR = '#E5E0FA';
// A day that HAS tracked points but scored 0 (e.g. entirely outside HK) gets
// the map's outside-HK gray, so it reads as "points, no value" rather than
// the same placeholder as a day with no data at all.
const ZERO_DATA_BAR_COLOR = EXPOSURE_MAP_CONFIG.outsideHkColor;
// Full-height tint behind the selected day — the only visible selection cue
// for a 0-exposure day, whose bar has no height to dim/undim. Neutral gray,
// not tinted: a colored tint could be mistaken for one of the io colors.
const SELECTED_SLOT_COLOR = 'rgba(28,28,30,0.06)';
const DIVIDER_COLOR = '#FFFFFF';

type Props = {
  history: DailyExposureEntry[];
  rangeStart: string; // YYYY-MM-DD, HK local, inclusive
  rangeEnd: string; // YYYY-MM-DD, HK local, inclusive
  selectedDate?: string;
  onSelectDay?: (date: string) => void;
  // Today's per-io split comes from the live useTodayExposure report, not
  // the persisted history (which can lag a tick behind) — this lets that
  // live split override whatever's in `history` for today's slot.
  todayOverride?: { date: string; byIo: Record<ExposureIo, number> };
  // Lets the range subtitle read "Today" instead of a bare date when it
  // applies — optional since some callers (e.g. a device workspace with no
  // live tracking) still want plain calendar dates only.
  todayKey?: string;
};

// total: null = no tracked data that day; 0 = tracked but nothing scored.
type DayBar = {
  date: string;
  label: string;
  byIo: Record<ExposureIo, number> | null;
  total: number | null;
};

// No existing bar-chart precedent in this repo — new, but reuses the same
// Svg/getX/getY/label conventions the hourly line charts already use. Shows
// one bar per day in the given [rangeStart, rangeEnd] range (inclusive),
// rather than a fixed trailing window. Each bar is stacked per io
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
      const byIo =
        todayOverride?.date === cursor
          ? todayOverride.byIo
          : entry
            ? sumExposureByIo(entry.report.segments).byIo
            : null;
      const [, m, d] = cursor.split('-');
      result.push({
        date: cursor,
        label: `${Number(m)}/${Number(d)}`,
        byIo,
        total: byIo ? EXPOSURE_IO_TYPES.reduce((sum, io) => sum + byIo[io], 0) : null,
      });
      cursor = addHkDays(cursor, 1);
    }
    // Trim untracked days off the START/END of the picked range only — an
    // all-empty edge just narrows every bar for nothing meaningful to show.
    // A no-data day strictly BETWEEN two tracked days is a real gap and
    // still renders as the empty placeholder bar, so only the leading/
    // trailing run gets dropped, never the middle.
    const firstDataIdx = result.findIndex(d => d.total !== null);
    if (firstDataIdx === -1) return result;
    const lastDataIdx = result.length - 1 - [...result].reverse().findIndex(d => d.total !== null);
    return result.slice(firstDataIdx, lastDataIdx + 1);
  }, [history, rangeStart, rangeEnd, todayOverride]);

  const maxTotal = Math.max(0, ...days.map(d => d.total ?? 0));
  const { ticks, niceMax } = useMemo(() => niceAxisTicks(maxTotal, 4), [maxTotal]);
  const dayCount = Math.max(days.length, 1);
  const isScrollable = dayCount > MAX_VISIBLE_DAY_BARS;
  // Zooms bars wider for a short range (down to the 3-day floor), and caps
  // them at the 30-day-wide window once the range grows past that.
  const visibleCount = Math.min(MAX_VISIBLE_DAY_BARS, Math.max(MIN_VISIBLE_DAY_BARS, dayCount));
  const slotWidth = CHART_WIDTH / visibleCount;
  const barWidth = slotWidth;
  const contentWidth = slotWidth * dayCount;
  // Once paging (>30 days), match the hourly chart's label density so the
  // two charts read as one system. Below that, keep the unchanged ceil(n/12)
  // density — no reason to thin labels on a week/month view that already
  // fits on screen.
  const labelEvery = isScrollable
    ? pickAxisLabelStride(MAX_VISIBLE_DAY_BARS, 6)
    : pickAxisLabelStride(dayCount, 12);

  const selectedDay = selectedDate ? days.find(d => d.date === selectedDate) ?? null : null;
  const selectedDayIndex = selectedDay ? days.indexOf(selectedDay) : -1;

  const baseY = PADDING_TOP + GRAPH_HEIGHT;
  const getY = (value: number) => baseY - (value / niceMax) * GRAPH_HEIGHT;
  const getSegmentHeight = (value: number) => (value / niceMax) * GRAPH_HEIGHT;

  // Defaults the scroll position to the most recent days whenever the range
  // changes. Deciding "should I scroll" and "did the native content view
  // actually finish laying out" in the SAME callback (rather than splitting
  // that across a separate effect + this native callback) avoids a race
  // where onContentSizeChange could fire before an effect's flag was set,
  // silently dropping the initial auto-scroll.
  const scrollRef = useRef<ScrollView>(null);
  const scrolledRangeRef = useRef<string | null>(null);
  const handleContentSizeChange = (w: number) => {
    if (!isScrollable) return;
    const rangeId = `${rangeStart}:${rangeEnd}`;
    if (scrolledRangeRef.current === rangeId) return;
    scrolledRangeRef.current = rangeId;
    scrollRef.current?.scrollTo({ x: w - CHART_WIDTH, animated: false });
  };

  const barsSvg = (
    <Svg width={contentWidth} height={SVG_HEIGHT}>
      {ticks.map(v => (
        <Line
          key={v}
          x1={0}
          y1={getY(v)}
          x2={contentWidth}
          y2={getY(v)}
          stroke="#718096"
          strokeOpacity={0.12}
        />
      ))}
      <Line x1={0} y1={baseY} x2={contentWidth} y2={baseY} stroke="#718096" strokeOpacity={0.25} />
      {days.map((day, i) => {
        const slotX = i * slotWidth;
        const barX = slotX;
        // Running top edge while stacking io layers bottom → top.
        let stackTop = baseY;
        const isSelected = selectedDate === day.date;
        const opacity = selectedDate && !isSelected ? 0.5 : 1;
        return (
          <React.Fragment key={day.date}>
            {isSelected && (
              <Rect
                x={slotX}
                y={PADDING_TOP}
                width={slotWidth}
                height={GRAPH_HEIGHT}
                fill={SELECTED_SLOT_COLOR}
              />
            )}
            {day.byIo && day.total && day.total > 0 ? (
              EXPOSURE_IO_TYPES.map(io => {
                const value = day.byIo?.[io] ?? 0;
                if (value <= 0) return null;
                const height = getSegmentHeight(value);
                stackTop -= height;
                return (
                  <Rect
                    key={io}
                    x={barX}
                    y={stackTop}
                    width={barWidth}
                    height={height}
                    fill={EXPOSURE_IO_CONFIG[io].color}
                    opacity={opacity}
                  />
                );
              })
            ) : (
              <Rect
                x={barX}
                y={baseY - 2}
                width={barWidth}
                height={2}
                fill={day.total === 0 ? ZERO_DATA_BAR_COLOR : EMPTY_BAR_COLOR}
              />
            )}
            {i % labelEvery === 0 && (() => {
              // Edge labels are anchored inward so they never render past
              // the chart's left/right bounds and get clipped — same
              // convention as AqhiHourlyForecastChart/ExposureTrendChart.
              const isFirst = i === 0;
              const isLast = i === days.length - 1;
              const textAnchor = isFirst ? 'start' : isLast ? 'end' : 'middle';
              const x = isFirst ? slotX : isLast ? slotX + slotWidth : slotX + slotWidth / 2;
              return (
                <SvgText
                  x={x}
                  y={SVG_HEIGHT - 8}
                  fontSize={9}
                  fontWeight={isSelected ? '700' : '400'}
                  fill={isSelected ? '#1C1C1E' : '#8E8E93'}
                  textAnchor={textAnchor}
                >
                  {day.label}
                </SvgText>
              );
            })()}
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
      {/* Any day with tracked data gets a label — including a 0-exposure
          day, so tapping it visibly "lands" instead of looking ignored. */}
      {selectedDay && selectedDay.total !== null && (() => {
        const labelText =
          selectedDay.total > 0 && selectedDay.byIo
            ? `${selectedDay.label}  ${formatIoBreakdown(selectedDay.byIo)}`
            : `${selectedDay.label}  No exposure (outside HK / not calculated)`;
        const { x, textAnchor } = clampedChartLabelX(
          selectedDayIndex * slotWidth + slotWidth / 2,
          contentWidth,
          estimateSvgTextWidth(labelText, SELECTED_LABEL_FONT_SIZE),
        );
        return (
          <SvgText
            x={x}
            y={PADDING_TOP - 10}
            fontSize={SELECTED_LABEL_FONT_SIZE}
            fontWeight="700"
            fill="#1C1C1E"
            textAnchor={textAnchor}
          >
            {labelText}
          </SvgText>
        );
      })()}
    </Svg>
  );

  // A real RN Pressable per day-slot, absolutely positioned over the Svg,
  // rather than an onPress on an Svg Rect: react-native-svg's own touch
  // handling doesn't reliably compose with a horizontal ScrollView's gesture
  // responder (the SVG shape can lose the touch to the ScrollView's pan
  // detection), whereas Pressable is the standard RN primitive built to
  // nest correctly inside ScrollView.
  const chartContent = (
    <View style={{ width: contentWidth, height: SVG_HEIGHT }}>
      {barsSvg}
      <View style={[styles.tapOverlay, { width: contentWidth }]}>
        {days.map(day => (
          <Pressable
            key={day.date}
            style={{ width: slotWidth }}
            onPress={() => onSelectDay?.(day.date)}
          />
        ))}
      </View>
    </View>
  );

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
        {EXPOSURE_IO_TYPES.map(io => (
          <View key={io} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: EXPOSURE_IO_CONFIG[io].color }]} />
            <Text style={styles.legendText}>{EXPOSURE_IO_CONFIG[io].label}</Text>
          </View>
        ))}
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
        {isScrollable ? (
          <ScrollView
            ref={scrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ width: CHART_WIDTH }}
            onContentSizeChange={handleContentSizeChange}
          >
            {chartContent}
          </ScrollView>
        ) : (
          chartContent
        )}
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
  tapOverlay: {
    position: 'absolute',
    left: 0,
    top: PADDING_TOP,
    height: GRAPH_HEIGHT,
    flexDirection: 'row',
  },
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
