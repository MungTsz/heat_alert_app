// src/components/ExposureDailyBarChart.tsx
import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, { Rect, Line, Text as SvgText } from 'react-native-svg';
import { DailyExposureEntry } from '../types/exposure';
import { addHkDays } from '../utils/hkDate';

const SCREEN_WIDTH = Dimensions.get('window').width - 72;
const SVG_HEIGHT = 150;
const PADDING_TOP = 12;
const PADDING_BOTTOM = 26;
const GRAPH_HEIGHT = SVG_HEIGHT - PADDING_TOP - PADDING_BOTTOM;
const MAX_BAR_WIDTH = 28;
const BAR_COLOR = '#8B5CF6';
const EMPTY_BAR_COLOR = '#E5E0FA';

type Props = {
  history: DailyExposureEntry[];
  rangeStart: string; // YYYY-MM-DD, HK local, inclusive
  rangeEnd: string; // YYYY-MM-DD, HK local, inclusive
  selectedDate?: string;
  onSelectDay?: (date: string) => void;
  // Today's total comes from the live useTodayExposure report, not the
  // persisted history (which can lag a tick behind) — this lets that live
  // number override whatever's in `history` for today's own slot.
  todayOverride?: { date: string; total: number };
};

// No existing bar-chart precedent in this repo — new, but reuses the same
// Svg/getX/getY/label conventions the hourly line charts already use. Shows
// one bar per day in the given [rangeStart, rangeEnd] range (inclusive),
// rather than a fixed trailing window.
const ExposureDailyBarChart: React.FC<Props> = ({
  history,
  rangeStart,
  rangeEnd,
  selectedDate,
  onSelectDay,
  todayOverride,
}) => {
  const days = useMemo(() => {
    const byDate = new Map(history.map(entry => [entry.date, entry]));
    const result: { date: string; label: string; total: number | null }[] = [];
    let cursor = rangeStart;
    while (cursor <= rangeEnd) {
      const total =
        todayOverride?.date === cursor
          ? todayOverride.total
          : byDate.get(cursor)?.report.totalExposure ?? null;
      const [, m, d] = cursor.split('-');
      result.push({ date: cursor, label: `${Number(m)}/${Number(d)}`, total });
      cursor = addHkDays(cursor, 1);
    }
    return result;
  }, [history, rangeStart, rangeEnd, todayOverride]);

  const maxTotal = Math.max(1, ...days.map(d => d.total ?? 0));
  const dayCount = Math.max(days.length, 1);
  const slotWidth = SCREEN_WIDTH / dayCount;
  const barWidth = Math.min(slotWidth * 0.5, MAX_BAR_WIDTH);
  // Sparse ranges skip labels to avoid overlapping text.
  const labelEvery = Math.max(1, Math.ceil(days.length / 12));

  const getBarHeight = (total: number | null) =>
    total && total > 0 ? (total / maxTotal) * GRAPH_HEIGHT : 2;

  return (
    <View>
      <Text style={styles.title}>
        Daily totals — {rangeStart}
        {rangeStart !== rangeEnd ? ` to ${rangeEnd}` : ''}
      </Text>
      <Svg width={SCREEN_WIDTH} height={SVG_HEIGHT}>
        <Line
          x1={0}
          y1={PADDING_TOP + GRAPH_HEIGHT}
          x2={SCREEN_WIDTH}
          y2={PADDING_TOP + GRAPH_HEIGHT}
          stroke="#718096"
          strokeOpacity={0.25}
        />
        {days.map((day, i) => {
          const height = getBarHeight(day.total);
          const slotX = i * slotWidth;
          const barX = slotX + (slotWidth - barWidth) / 2;
          const barY = PADDING_TOP + GRAPH_HEIGHT - height;
          const isSelected = selectedDate === day.date;
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
              <Rect
                x={barX}
                y={barY}
                width={barWidth}
                height={height}
                rx={4}
                fill={day.total != null ? BAR_COLOR : EMPTY_BAR_COLOR}
                opacity={selectedDate && !isSelected ? 0.5 : 1}
              />
              {i % labelEvery === 0 && (
                <SvgText
                  x={slotX + slotWidth / 2}
                  y={SVG_HEIGHT - 8}
                  fontSize={9}
                  fontWeight={isSelected ? '700' : '400'}
                  fill={isSelected ? BAR_COLOR : '#8E8E93'}
                  textAnchor="middle"
                >
                  {day.label}
                </SvgText>
              )}
            </React.Fragment>
          );
        })}
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  title: { fontSize: 13, fontWeight: '700', color: '#1C1C1E', marginBottom: 4 },
});

export default ExposureDailyBarChart;
