// src/components/ExposureWeekCard.tsx
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  FlatList,
  TouchableOpacity,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from 'react-native';
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { DailyExposureEntry, EXPOSURE_IO_TYPES, ExposureReport } from '../types/exposure';
import { getHkWeekStartKey } from '../utils/hkDate';
import { sumExposureByIo } from '../utils/exposureIoTotals';
import {
  addHkWeeks,
  buildDailyIoMap,
  buildWeekDays,
  compareWeeks,
  computeWeekStats,
  formatHkWeekRangeLabel,
  listWeekStarts,
} from '../utils/exposureWeekStats';
import { EXPOSURE_IO_CONFIG } from '../config/exposureIoConfig';
import { EXPOSURE_WEEK_CHART_CONFIG, WEEK_START_DAY } from '../config/exposureWeekChartConfig';
import ExposureDailyBarChart, { WeekChartYTitle, Y_TITLE_WIDTH } from './ExposureDailyBarChart';

// Screen padding (20 × 2) + card padding (16 × 2) — same inner-width
// convention ExposureTrendChart uses.
const CARD_INNER_WIDTH = Dimensions.get('window').width - 72;
const PAGE_WIDTH = CARD_INNER_WIDTH - Y_TITLE_WIDTH;
// Only the visible week and its neighbours need to stay rendered.
const PAGER_WINDOW_SIZE = 3;

type Props = {
  history: DailyExposureEntry[];
  todayKey: string;
  // Live device only — overrides today's slot with the freshest report.
  todayReport: ExposureReport | null;
  weekStart: string; // the visible week, owned by the caller
  selectedDate: string | null;
  onSelectDay: (date: string) => void;
  onWeekChange: (weekStart: string) => void;
};

// The Exposure tab's weekly summary: daily average + week-over-week change
// for the visible week, above a swipeable Sun→Sat bar chart (one page per
// week). The caller owns weekStart/selectedDate so a calendar pick, a swipe
// and the ‹ › buttons all go through the same state.
const ExposureWeekCard: React.FC<Props> = ({
  history,
  todayKey,
  todayReport,
  weekStart,
  selectedDate,
  onSelectDay,
  onWeekChange,
}) => {
  const dailyMap = useMemo(
    () =>
      buildDailyIoMap(
        history,
        todayReport ? { date: todayKey, byIo: sumExposureByIo(todayReport.segments).byIo } : undefined,
      ),
    [history, todayKey, todayReport],
  );

  // Pages run from the oldest tracked week (or the visible week, if a
  // calendar pick landed earlier) through the current week — empty weeks in
  // between still get a page so swiping is strictly one week per step.
  const weeks = useMemo(() => {
    const earliest = history.reduce(
      (min, entry) => (entry.date < min ? entry.date : min),
      weekStart < todayKey ? weekStart : todayKey,
    );
    const currentWeek = getHkWeekStartKey(todayKey, WEEK_START_DAY);
    return listWeekStarts(
      getHkWeekStartKey(earliest, WEEK_START_DAY),
      weekStart > currentWeek ? weekStart : currentWeek,
    );
  }, [history, todayKey, weekStart]);
  const weekIndex = Math.max(0, weeks.indexOf(weekStart));

  const currentStats = computeWeekStats(buildWeekDays(weekStart, dailyMap, todayKey));
  const previousStats = computeWeekStats(
    buildWeekDays(addHkWeeks(weekStart, -1), dailyMap, todayKey),
  );
  const comparison = compareWeeks(currentStats.dailyAverage, previousStats.dailyAverage);

  // Keeps the pager in sync when weekStart changes from OUTSIDE a swipe (a
  // calendar pick or the ‹ › buttons), or when older history loads and
  // prepends pages (shifting the visible week's index). pageRef tracks the
  // page the list is actually showing, so a swipe — which already landed on
  // the right page — doesn't trigger a redundant scroll back.
  const listRef = useRef<FlatList<string>>(null);
  const pageRef = useRef(weekIndex);
  const lastWeekStartRef = useRef(weekStart);
  useEffect(() => {
    const weekChanged = lastWeekStartRef.current !== weekStart;
    lastWeekStartRef.current = weekStart;
    if (pageRef.current === weekIndex) return;
    pageRef.current = weekIndex;
    listRef.current?.scrollToOffset({ offset: weekIndex * PAGE_WIDTH, animated: weekChanged });
  }, [weekIndex, weekStart]);

  const handleMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const page = Math.round(e.nativeEvent.contentOffset.x / PAGE_WIDTH);
    pageRef.current = page;
    const landed = weeks[page];
    if (landed && landed !== weekStart) onWeekChange(landed);
  };

  const renderWeek = useCallback(
    ({ item }: { item: string }) => {
      const days = buildWeekDays(item, dailyMap, todayKey);
      return (
        <ExposureDailyBarChart
          days={days}
          average={computeWeekStats(days).dailyAverage}
          selectedDate={selectedDate}
          onSelectDay={onSelectDay}
          todayKey={todayKey}
          width={PAGE_WIDTH}
        />
      );
    },
    [dailyMap, todayKey, selectedDate, onSelectDay],
  );

  const canGoBack = weekIndex > 0;
  const canGoForward = weekIndex < weeks.length - 1;
  const TrendIcon = comparison?.direction === 'up' ? ArrowUp : ArrowDown;

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.averageLabel}>Daily Average</Text>
          <Text style={styles.averageValue}>
            {currentStats.dailyAverage !== null ? currentStats.dailyAverage.toFixed(2) : '—'}
            <Text style={styles.averageUnit}> %AR·h</Text>
          </Text>
        </View>
        {comparison && (
          <View style={styles.trendChip}>
            {comparison.direction !== 'same' && (
              <TrendIcon size={13} color={EXPOSURE_WEEK_CHART_CONFIG.trendColor} />
            )}
            <Text style={styles.trendText}>
              {comparison.direction === 'same'
                ? 'Same as last week'
                : `${comparison.pct}% vs last week`}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.pagerNavRow}>
        <TouchableOpacity
          onPress={() => onWeekChange(weeks[weekIndex - 1])}
          disabled={!canGoBack}
          hitSlop={10}
        >
          <ChevronLeft size={18} color={canGoBack ? '#333' : '#C7C7CC'} />
        </TouchableOpacity>
        <Text style={styles.weekRangeText}>{formatHkWeekRangeLabel(weekStart)}</Text>
        <TouchableOpacity
          onPress={() => onWeekChange(weeks[weekIndex + 1])}
          disabled={!canGoForward}
          hitSlop={10}
        >
          <ChevronRight size={18} color={canGoForward ? '#333' : '#C7C7CC'} />
        </TouchableOpacity>
      </View>

      <View style={styles.legendRow}>
        {EXPOSURE_IO_TYPES.map(io => (
          <View key={io} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: EXPOSURE_IO_CONFIG[io].color }]} />
            <Text style={styles.legendText}>{EXPOSURE_IO_CONFIG[io].label}</Text>
          </View>
        ))}
      </View>

      <View style={styles.chartRow}>
        <WeekChartYTitle />
        <FlatList
          ref={listRef}
          style={{ width: PAGE_WIDTH }}
          data={weeks}
          keyExtractor={item => item}
          renderItem={renderWeek}
          extraData={renderWeek}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          initialScrollIndex={weekIndex}
          getItemLayout={(_, index) => ({ length: PAGE_WIDTH, offset: PAGE_WIDTH * index, index })}
          windowSize={PAGER_WINDOW_SIZE}
          onMomentumScrollEnd={handleMomentumEnd}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 10,
  },
  averageLabel: { fontSize: 12, fontWeight: '600', color: '#8E8E93' },
  averageValue: { fontSize: 28, fontWeight: '700', color: '#1C1C1E', marginTop: 2 },
  averageUnit: { fontSize: 12, fontWeight: '600', color: '#8E8E93' },
  trendChip: { flexDirection: 'row', alignItems: 'center', gap: 3, marginBottom: 6 },
  trendText: { fontSize: 12, fontWeight: '600', color: EXPOSURE_WEEK_CHART_CONFIG.trendColor },
  pagerNavRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  weekRangeText: { fontSize: 13, fontWeight: '700', color: '#1C1C1E' },
  // Wraps: five io types no longer fit on one line on narrow phones.
  legendRow: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 14, rowGap: 4, marginBottom: 6 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11, color: '#8E8E93' },
  chartRow: { flexDirection: 'row', alignItems: 'flex-start' },
});

export default ExposureWeekCard;
