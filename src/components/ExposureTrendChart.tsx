// src/components/ExposureTrendChart.tsx
import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, { Rect, Line, Text as SvgText } from 'react-native-svg';
import { EXPOSURE_IO_TYPES, ExposureSegmentResult } from '../types/exposure';
import { bucketExposureByHour } from '../utils/exposureHourlyBuckets';
import { formatIoBreakdown, ioTypesWithExposure } from '../utils/exposureIoTotals';
import { pickAxisLabelStride } from '../utils/chartAxisLabels';
import { clampedChartLabelX, estimateSvgTextWidth } from '../utils/svgChartLabel';
import { niceAxisTicks } from '../utils/niceAxisTicks';
import { EXPOSURE_IO_CONFIG } from '../config/exposureIoConfig';
import ExposureIoLegend from './ExposureIoLegend';

const SCREEN_WIDTH = Dimensions.get('window').width - 72;
const SVG_HEIGHT = 160;
const X_TITLE_HEIGHT = 14;
const X_TITLE_MARGIN_TOP = 2;
// Exported so ExposureHourlyPager can size its pages (and its "no data"
// placeholder pages) to exactly one chart, keeping the pager height steady
// while swiping between days with and without data.
export const TREND_CHART_WIDTH = SCREEN_WIDTH;
export const TREND_CHART_BODY_HEIGHT = SVG_HEIGHT + X_TITLE_MARGIN_TOP + X_TITLE_HEIGHT;
const PADDING_TOP = 26;
const PADDING_BOTTOM = 26;
const GRAPH_HEIGHT = SVG_HEIGHT - PADDING_TOP - PADDING_BOTTOM;
// Rotated axis-title column + tick-value column to the left of the main
// bar Svg — same side-by-side-Svg convention AqhiHourlyForecastChart/
// DailyHeatForecastCard use for their y-axes.
const Y_TITLE_WIDTH = 14;
const Y_AXIS_WIDTH = 32;
const CHART_WIDTH = SCREEN_WIDTH - Y_TITLE_WIDTH - Y_AXIS_WIDTH;
const EMPTY_BAR_COLOR = '#E5E0FA';
const DIVIDER_COLOR = '#FFFFFF';
// Horizontal seam between stacked io layers — with seven io colors, some
// dark neighbours (e.g. MTR red over Other Indoor teal) otherwise blur into
// one block on a 12px-wide bar.
const STACK_SEAM_WIDTH = 1;
const SELECTED_LABEL_FONT_SIZE = 11;

type Props = {
  segments: ExposureSegmentResult[];
  // Callers that already show their own "Hourly Exposure"-style header
  // omit this to avoid a duplicate title; callers with no header of their
  // own (single-day views) pass one.
  title?: string;
  // A pager draws one shared legend above its pages instead, so the legend
  // doesn't slide with every swipe.
  showLegend?: boolean;
};

// One stacked bar per hour-of-day (0-23, HK local) — one layer per io in
// EXPOSURE_IO_TYPES order (Outdoor at the bottom), colored from
// EXPOSURE_IO_CONFIG (shared with the map dots) — reusing the same Svg/Rect/Line/SvgText/tap-to-select
// conventions as ExposureDailyBarChart for visual consistency between the
// exposure charts, just bucketed by hour and split by io instead of one flat
// total. Bars fill their full hour slot (no gap) with a thin white divider
// between adjacent bars, so the chart reads as one continuous strip rather
// than 24 separate columns.
const ExposureTrendChart: React.FC<Props> = ({ segments, title, showLegend = true }) => {
  const [selectedHour, setSelectedHour] = useState<number | null>(null);

  const hours = useMemo(() => bucketExposureByHour(segments), [segments]);
  const presentIos = useMemo(() => ioTypesWithExposure(hours.map(h => h.byIo)), [hours]);
  const maxTotal = Math.max(0, ...hours.map(h => h.total));
  const { ticks, niceMax } = useMemo(() => niceAxisTicks(maxTotal, 4), [maxTotal]);
  const slotWidth = CHART_WIDTH / 24;
  const barWidth = slotWidth;
  const labelEvery = pickAxisLabelStride(24, 6); // matches AqhiHourlyForecastChart's 4-hour label spacing

  const baseY = PADDING_TOP + GRAPH_HEIGHT;
  const getY = (value: number) => baseY - (value / niceMax) * GRAPH_HEIGHT;
  const getSegmentHeight = (value: number) => (value / niceMax) * GRAPH_HEIGHT;

  const selected = selectedHour !== null ? hours[selectedHour] : null;

  if (hours.every(h => h.total === 0)) return null;

  return (
    <View>
      {title && <Text style={styles.title}>{title}</Text>}
      {showLegend && <ExposureIoLegend present={presentIos} />}
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
          {hours.map(h => {
            const slotX = h.hour * slotWidth;
            const barX = slotX;
            // Running top edge while stacking io layers bottom → top.
            let stackTop = baseY;
            const isSelected = selectedHour === h.hour;
            const opacity = selectedHour !== null && !isSelected ? 0.5 : 1;
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
                {h.total > 0 ? (
                  EXPOSURE_IO_TYPES.map(io => {
                    if (h.byIo[io] <= 0) return null;
                    const height = getSegmentHeight(h.byIo[io]);
                    const layerBottom = stackTop;
                    stackTop -= height;
                    return (
                      <React.Fragment key={io}>
                        <Rect
                          x={barX}
                          y={stackTop}
                          width={barWidth}
                          height={height}
                          fill={EXPOSURE_IO_CONFIG[io].color}
                          opacity={opacity}
                        />
                        {layerBottom < baseY && (
                          <Line
                            x1={barX}
                            y1={layerBottom}
                            x2={barX + barWidth}
                            y2={layerBottom}
                            stroke={DIVIDER_COLOR}
                            strokeWidth={STACK_SEAM_WIDTH}
                          />
                        )}
                      </React.Fragment>
                    );
                  })
                ) : (
                  <Rect x={barX} y={baseY - 2} width={barWidth} height={2} fill={EMPTY_BAR_COLOR} />
                )}
                {h.hour % labelEvery === 0 && (() => {
                  // Edge labels are anchored inward so they never render past
                  // the chart's left/right bounds and get clipped (e.g.
                  // "12AM" at hour 0) — same convention as
                  // AqhiHourlyForecastChart's x-axis labels.
                  const isFirst = h.hour === 0;
                  const isLast = h.hour === 23;
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
                      {h.label}
                    </SvgText>
                  );
                })()}
              </React.Fragment>
            );
          })}
          {/* Thin white seams between touching bars so adjacent hours stay
              visually distinct without leaving an actual gap in the strip. */}
          {Array.from({ length: 23 }, (_, i) => i + 1).map(i => (
            <Line
              key={`divider-${i}`}
              x1={i * slotWidth}
              y1={PADDING_TOP}
              x2={i * slotWidth}
              y2={baseY}
              stroke={DIVIDER_COLOR}
              strokeWidth={1.5}
            />
          ))}
          {selected && selected.total > 0 && (() => {
            const labelText = `${selected.label}  ${formatIoBreakdown(selected.byIo)}`;
            const { x, textAnchor } = clampedChartLabelX(
              selected.hour * slotWidth + slotWidth / 2,
              CHART_WIDTH,
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
      </View>
      <Text style={styles.xTitleText}>Hour (HK time)</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  title: { fontSize: 13, fontWeight: '700', color: '#1C1C1E', marginBottom: 4 },
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
    height: X_TITLE_HEIGHT,
    lineHeight: X_TITLE_HEIGHT,
    marginTop: X_TITLE_MARGIN_TOP,
    marginLeft: Y_TITLE_WIDTH + Y_AXIS_WIDTH,
  },
});

export default ExposureTrendChart;
