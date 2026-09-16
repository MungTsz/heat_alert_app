// src/components/ExposureTrendChart.tsx
import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, { Rect, Line, Text as SvgText } from 'react-native-svg';
import { ExposureSegmentResult } from '../types/exposure';
import { bucketExposureByHour } from '../utils/exposureHourlyBuckets';
import { clampedChartLabelX, estimateSvgTextWidth } from '../utils/svgChartLabel';
import { EXPOSURE_MAP_CONFIG } from '../config/exposureMapConfig';

const SCREEN_WIDTH = Dimensions.get('window').width - 72;
const SVG_HEIGHT = 160;
const PADDING_TOP = 26;
const PADDING_BOTTOM = 26;
const GRAPH_HEIGHT = SVG_HEIGHT - PADDING_TOP - PADDING_BOTTOM;
const MAX_BAR_WIDTH = 14;
// Shared with ExposureTrajectoryMap's dot coloring so the same io state
// reads the same color across map and chart.
const INDOOR_COLOR = EXPOSURE_MAP_CONFIG.indoorColor;
const OUTDOOR_COLOR = EXPOSURE_MAP_CONFIG.outdoorColor;
const EMPTY_BAR_COLOR = '#E5E0FA';
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
// total.
const ExposureTrendChart: React.FC<Props> = ({ segments, title }) => {
  const [selectedHour, setSelectedHour] = useState<number | null>(null);

  const hours = useMemo(() => bucketExposureByHour(segments), [segments]);
  const maxTotal = Math.max(1, ...hours.map(h => h.total));
  const slotWidth = SCREEN_WIDTH / 24;
  const barWidth = Math.min(slotWidth * 0.6, MAX_BAR_WIDTH);
  const labelEvery = 4; // matches AqhiHourlyForecastChart's 4-hour label spacing

  const getSegmentHeight = (value: number) => (value / maxTotal) * GRAPH_HEIGHT;

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
      <Svg width={SCREEN_WIDTH} height={SVG_HEIGHT}>
        <Line
          x1={0}
          y1={PADDING_TOP + GRAPH_HEIGHT}
          x2={SCREEN_WIDTH}
          y2={PADDING_TOP + GRAPH_HEIGHT}
          stroke="#718096"
          strokeOpacity={0.25}
        />
        {hours.map(h => {
          const outdoorHeight = getSegmentHeight(h.outdoor);
          const indoorHeight = getSegmentHeight(h.indoor);
          const slotX = h.hour * slotWidth;
          const barX = slotX + (slotWidth - barWidth) / 2;
          const baseY = PADDING_TOP + GRAPH_HEIGHT;
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
                      rx={3}
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
                      rx={3}
                      fill={INDOOR_COLOR}
                      opacity={opacity}
                    />
                  )}
                </>
              ) : (
                <Rect
                  x={barX}
                  y={baseY - 2}
                  width={barWidth}
                  height={2}
                  rx={1}
                  fill={EMPTY_BAR_COLOR}
                />
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
        {selected && selected.total > 0 && (() => {
          const labelText = `${selected.label}  Outdoor ${selected.outdoor.toFixed(2)} · Indoor ${selected.indoor.toFixed(2)}`;
          const { x, textAnchor } = clampedChartLabelX(
            selected.hour * slotWidth + slotWidth / 2,
            SCREEN_WIDTH,
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
  );
};

const styles = StyleSheet.create({
  title: { fontSize: 13, fontWeight: '700', color: '#1C1C1E', marginBottom: 4 },
  legendRow: { flexDirection: 'row', gap: 14, marginBottom: 6 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11, color: '#8E8E93' },
});

export default ExposureTrendChart;
