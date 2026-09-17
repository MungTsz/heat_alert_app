// src/components/ExposureTrendChart.tsx
import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, { Rect, Line, Text as SvgText } from 'react-native-svg';
import { ExposureSegmentResult } from '../types/exposure';
import { bucketExposureByHour } from '../utils/exposureHourlyBuckets';
import { clampedChartLabelX, estimateSvgTextWidth } from '../utils/svgChartLabel';
import { niceAxisTicks } from '../utils/niceAxisTicks';
import { EXPOSURE_MAP_CONFIG } from '../config/exposureMapConfig';

const SCREEN_WIDTH = Dimensions.get('window').width - 72;
const SVG_HEIGHT = 160;
const PADDING_TOP = 26;
const PADDING_BOTTOM = 26;
const GRAPH_HEIGHT = SVG_HEIGHT - PADDING_TOP - PADDING_BOTTOM;
// Rotated axis-title column + tick-value column to the left of the main
// bar Svg — same side-by-side-Svg convention AqhiHourlyForecastChart/
// DailyHeatForecastCard use for their y-axes.
const Y_TITLE_WIDTH = 14;
const Y_AXIS_WIDTH = 32;
const CHART_WIDTH = SCREEN_WIDTH - Y_TITLE_WIDTH - Y_AXIS_WIDTH;
// Shared with ExposureTrajectoryMap's dot coloring so the same io state
// reads the same color across map and chart.
const INDOOR_COLOR = EXPOSURE_MAP_CONFIG.indoorColor;
const OUTDOOR_COLOR = EXPOSURE_MAP_CONFIG.outdoorColor;
const EMPTY_BAR_COLOR = '#E5E0FA';
const DIVIDER_COLOR = '#FFFFFF';
const SELECTED_LABEL_FONT_SIZE = 11;

type Props = {
  segments: ExposureSegmentResult[];
  // Callers that already show their own "Hourly Exposure"-style header
  // (e.g. ExposureRangeReportView) omit this to avoid a duplicate title;
  // callers with no header of their own (single-day views) pass one.
  title?: string;
};

// One stacked bar per hour-of-day (0-23, HK local) — Outdoor on the bottom,
// Indoor stacked on top — reusing the same Svg/Rect/Line/SvgText/tap-to-select
// conventions as ExposureDailyBarChart for visual consistency between the
// exposure charts, just bucketed by hour and split by io instead of one flat
// total. Bars fill their full hour slot (no gap) with a thin white divider
// between adjacent bars, so the chart reads as one continuous strip rather
// than 24 separate columns.
const ExposureTrendChart: React.FC<Props> = ({ segments, title }) => {
  const [selectedHour, setSelectedHour] = useState<number | null>(null);

  const hours = useMemo(() => bucketExposureByHour(segments), [segments]);
  const maxTotal = Math.max(0, ...hours.map(h => h.total));
  const { ticks, niceMax } = useMemo(() => niceAxisTicks(maxTotal, 4), [maxTotal]);
  const slotWidth = CHART_WIDTH / 24;
  const barWidth = slotWidth;
  const labelEvery = 4; // matches AqhiHourlyForecastChart's 4-hour label spacing

  const baseY = PADDING_TOP + GRAPH_HEIGHT;
  const getY = (value: number) => baseY - (value / niceMax) * GRAPH_HEIGHT;
  const getSegmentHeight = (value: number) => (value / niceMax) * GRAPH_HEIGHT;

  const selected = selectedHour !== null ? hours[selectedHour] : null;

  if (hours.every(h => h.total === 0)) return null;

  return (
    <View>
      {title && <Text style={styles.title}>{title}</Text>}
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
          {hours.map(h => {
            const outdoorHeight = getSegmentHeight(h.outdoor);
            const indoorHeight = getSegmentHeight(h.indoor);
            const slotX = h.hour * slotWidth;
            const barX = slotX;
            const outdoorY = baseY - outdoorHeight;
            const indoorY = outdoorY - indoorHeight;
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
                  <>
                    {h.outdoor > 0 && (
                      <Rect
                        x={barX}
                        y={outdoorY}
                        width={barWidth}
                        height={outdoorHeight}
                        fill={OUTDOOR_COLOR}
                        opacity={opacity}
                      />
                    )}
                    {h.indoor > 0 && (
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
                {h.hour % labelEvery === 0 && (
                  <SvgText
                    x={slotX + slotWidth / 2}
                    y={SVG_HEIGHT - 8}
                    fontSize={9}
                    fontWeight={isSelected ? '700' : '400'}
                    fill={isSelected ? '#1C1C1E' : '#8E8E93'}
                    textAnchor="middle"
                  >
                    {h.label}
                  </SvgText>
                )}
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
            const labelText = `${selected.label}  Outdoor ${selected.outdoor.toFixed(2)} · Indoor ${selected.indoor.toFixed(2)}`;
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

export default ExposureTrendChart;
