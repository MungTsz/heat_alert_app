// src/components/ExposureDailyBarChart.tsx
import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Svg, { Rect, Line, Text as SvgText } from 'react-native-svg';
import { EXPOSURE_IO_TYPES } from '../types/exposure';
import { DayBar } from '../utils/exposureWeekStats';
import { formatIoBreakdown } from '../utils/exposureIoTotals';
import { niceAxisTicks } from '../utils/niceAxisTicks';
import { clampedChartLabelX, estimateSvgTextWidth } from '../utils/svgChartLabel';
import { EXPOSURE_MAP_CONFIG } from '../config/exposureMapConfig';
import { EXPOSURE_IO_CONFIG } from '../config/exposureIoConfig';
import { EXPOSURE_WEEK_CHART_CONFIG } from '../config/exposureWeekChartConfig';

const SVG_HEIGHT = 170;
const PADDING_TOP = 26;
const PADDING_BOTTOM = 26;
const GRAPH_HEIGHT = SVG_HEIGHT - PADDING_TOP - PADDING_BOTTOM;
// Rotated axis-title column + tick-value column to the left of the main
// bar Svg — same side-by-side-Svg convention AqhiHourlyForecastChart/
// DailyHeatForecastCard use for their y-axes, and matches ExposureTrendChart.
// The tick column lives INSIDE each page (every week gets its own scale);
// only the title column stays fixed outside the swipeable pages.
export const Y_TITLE_WIDTH = 14;
const Y_AXIS_WIDTH = 32;
// Right-hand gutter for the average line's "Avg" label, so it never sits on
// top of Saturday's bar.
const AVG_LABEL_GUTTER = 26;
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
// Same horizontal seam between stacked io layers as ExposureTrendChart.
const STACK_SEAM_WIDTH = 1;
const FUTURE_LABEL_COLOR = '#C7C7CC';

type Props = {
  days: DayBar[]; // exactly one week, see buildWeekDays
  average: number | null;
  selectedDate: string | null;
  onSelectDay: (date: string) => void;
  todayKey: string;
  width: number; // full page width, tick column included
};

// One Sun→Sat page of the Exposure tab's swipeable weekly chart (paged by
// ExposureWeekCard). Each bar is stacked per io (same stacked-bar treatment
// as ExposureTrendChart's hourly bars) rather than one flat total, so the
// daily and hourly charts read as one consistent system. Bars fill their
// full day slot (no gap) with a thin white divider between adjacent bars,
// and a dashed line marks the week's daily average.
const ExposureDailyBarChart: React.FC<Props> = ({
  days,
  average,
  selectedDate,
  onSelectDay,
  todayKey,
  width,
}) => {
  const chartWidth = width - Y_AXIS_WIDTH - AVG_LABEL_GUTTER;
  const maxTotal = Math.max(0, ...days.map(d => d.total ?? 0));
  // Per-week scale (not shared across pages): a quiet week would otherwise
  // flatten into the baseline next to a busy one.
  const { ticks, niceMax } = niceAxisTicks(maxTotal, 4);
  const slotWidth = chartWidth / days.length;

  const selectedDayIndex = days.findIndex(d => d.date === selectedDate);
  const selectedDay = selectedDayIndex >= 0 ? days[selectedDayIndex] : null;

  const baseY = PADDING_TOP + GRAPH_HEIGHT;
  const getY = (value: number) => baseY - (value / niceMax) * GRAPH_HEIGHT;
  const getSegmentHeight = (value: number) => (value / niceMax) * GRAPH_HEIGHT;

  const barsSvg = (
    <Svg width={chartWidth + AVG_LABEL_GUTTER} height={SVG_HEIGHT}>
      {ticks.map(v => (
        <Line
          key={v}
          x1={0}
          y1={getY(v)}
          x2={chartWidth}
          y2={getY(v)}
          stroke="#718096"
          strokeOpacity={0.12}
        />
      ))}
      <Line x1={0} y1={baseY} x2={chartWidth} y2={baseY} stroke="#718096" strokeOpacity={0.25} />
      {days.map((day, i) => {
        const slotX = i * slotWidth;
        // Running top edge while stacking io layers bottom → top.
        let stackTop = baseY;
        const isSelected = selectedDate === day.date;
        const opacity = selectedDate && !isSelected ? 0.5 : 1;
        const isToday = day.date === todayKey;
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
            {day.byIo && day.total && day.total > 0
              ? EXPOSURE_IO_TYPES.map(io => {
                  const value = day.byIo?.[io] ?? 0;
                  if (value <= 0) return null;
                  const height = getSegmentHeight(value);
                  const layerBottom = stackTop;
                  stackTop -= height;
                  return (
                    <React.Fragment key={io}>
                      <Rect
                        x={slotX}
                        y={stackTop}
                        width={slotWidth}
                        height={height}
                        fill={EXPOSURE_IO_CONFIG[io].color}
                        opacity={opacity}
                      />
                      {layerBottom < baseY && (
                        <Line
                          x1={slotX}
                          y1={layerBottom}
                          x2={slotX + slotWidth}
                          y2={layerBottom}
                          stroke={DIVIDER_COLOR}
                          strokeWidth={STACK_SEAM_WIDTH}
                        />
                      )}
                    </React.Fragment>
                  );
                })
              : !day.isFuture && (
                  <Rect
                    x={slotX}
                    y={baseY - 2}
                    width={slotWidth}
                    height={2}
                    fill={day.total === 0 ? ZERO_DATA_BAR_COLOR : EMPTY_BAR_COLOR}
                  />
                )}
            <SvgText
              x={slotX + slotWidth / 2}
              y={SVG_HEIGHT - 8}
              fontSize={9}
              fontWeight={isSelected || isToday ? '700' : '400'}
              fill={day.isFuture ? FUTURE_LABEL_COLOR : isSelected ? '#1C1C1E' : '#8E8E93'}
              textAnchor="middle"
            >
              {day.label}
            </SvgText>
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
      {/* Drawn after the bars so it stays visible across tall bars. */}
      {average !== null && average > 0 && (
        <>
          <Line
            x1={0}
            y1={getY(average)}
            x2={chartWidth}
            y2={getY(average)}
            stroke={EXPOSURE_WEEK_CHART_CONFIG.avgLineColor}
            strokeWidth={1.5}
            strokeDasharray={EXPOSURE_WEEK_CHART_CONFIG.avgLineDash}
          />
          <SvgText
            x={chartWidth + 4}
            y={getY(average) + 3}
            fontSize={9}
            fontWeight="700"
            fill={EXPOSURE_WEEK_CHART_CONFIG.avgLineColor}
            textAnchor="start"
          >
            {EXPOSURE_WEEK_CHART_CONFIG.avgLabel}
          </SvgText>
        </>
      )}
      {/* Any day with tracked data gets a label — including a 0-exposure
          day, so tapping it visibly "lands" instead of looking ignored. */}
      {selectedDay && selectedDay.total !== null && (() => {
        const labelText =
          selectedDay.total > 0 && selectedDay.byIo
            ? `${selectedDay.label}  ${formatIoBreakdown(selectedDay.byIo)}`
            : `${selectedDay.label}  No exposure (outside HK / not calculated)`;
        const { x, textAnchor } = clampedChartLabelX(
          selectedDayIndex * slotWidth + slotWidth / 2,
          chartWidth,
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

  return (
    <View style={[styles.page, { width }]}>
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
      <View>
        {barsSvg}
        {/* A real RN Pressable per day-slot, absolutely positioned over the
            Svg, rather than an onPress on an Svg Rect: react-native-svg's own
            touch handling doesn't reliably compose with a horizontal
            scroller's gesture responder (the SVG shape can lose the touch to
            the pager's pan detection), whereas Pressable is the standard RN
            primitive built to nest correctly inside a FlatList/ScrollView. */}
        <View style={[styles.tapOverlay, { width: chartWidth }]}>
          {days.map(day => (
            <Pressable
              key={day.date}
              style={{ width: slotWidth }}
              disabled={day.isFuture}
              onPress={() => onSelectDay(day.date)}
            />
          ))}
        </View>
      </View>
    </View>
  );
};

// The fixed rotated y-axis title beside the swipeable pages — exported from
// here so it shares this chart's vertical layout constants instead of
// duplicating them in ExposureWeekCard.
export const WeekChartYTitle: React.FC = () => (
  <View style={styles.yTitleColumn}>
    <Text style={styles.yTitleText} numberOfLines={1}>
      Exposure (%AR·h)
    </Text>
  </View>
);

const styles = StyleSheet.create({
  page: { flexDirection: 'row', alignItems: 'flex-start', height: SVG_HEIGHT },
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
});

export default ExposureDailyBarChart;
