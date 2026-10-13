// src/components/ExposureHourlyPager.tsx
import React, { useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { ExposureSegmentResult } from '../types/exposure';
import { formatHkDateLabel } from '../utils/hkDate';
import { useSyncedPager } from '../hooks/useSyncedPager';
import ExposureTrendChart, {
  TREND_CHART_BODY_HEIGHT,
  TREND_CHART_WIDTH,
} from './ExposureTrendChart';
import ExposureIoLegend from './ExposureIoLegend';

// Only the visible day and its neighbours need to stay rendered.
const PAGER_WINDOW_SIZE = 3;

// What one day's page shows: its segments, or a message when there's no
// chart to draw (not tracked, still calculating, still importing…).
export type HourlyPageContent = ExposureSegmentResult[] | string;

type Props = {
  // Every pageable day, oldest first, one per calendar day.
  dates: readonly string[];
  selectedDate: string;
  todayKey: string;
  getPage: (date: string) => HourlyPageContent;
  onDateChange: (date: string) => void;
};

// The hourly chart as a day pager — the same swipe / ‹ › model as the week
// card above it, one page per day. The caller owns selectedDate, so a swipe
// here moves the whole day selection (week bar, map, stats) together.
const ExposureHourlyPager: React.FC<Props> = ({
  dates,
  selectedDate,
  todayKey,
  getPage,
  onDateChange,
}) => {
  const { listRef, index, onMomentumScrollEnd, getItemLayout } = useSyncedPager(
    dates,
    selectedDate,
    TREND_CHART_WIDTH,
    onDateChange,
  );

  const renderDay = useCallback(
    ({ item }: { item: string }) => {
      const page = getPage(item);
      // Mirrors addSegmentToIoTotals: only positive exposure is charted, so
      // a day of outside-HK / failed rows gets the message, not a blank chart.
      const message =
        typeof page === 'string'
          ? page
          : page.some(s => s.exposure > 0)
            ? null
            : 'No exposure recorded for this day.';
      return (
        <View style={styles.page}>
          {message === null && typeof page !== 'string' ? (
            <ExposureTrendChart segments={page} showLegend={false} />
          ) : (
            <View style={styles.placeholder}>
              <Text style={styles.placeholderText}>{message}</Text>
            </View>
          )}
        </View>
      );
    },
    [getPage],
  );

  const canGoBack = index > 0;
  const canGoForward = index < dates.length - 1;

  return (
    <View>
      <Text style={styles.title}>Hourly Exposure</Text>
      <View style={styles.navRow}>
        <TouchableOpacity
          onPress={() => onDateChange(dates[index - 1])}
          disabled={!canGoBack}
          hitSlop={10}
        >
          <ChevronLeft size={18} color={canGoBack ? '#333' : '#C7C7CC'} />
        </TouchableOpacity>
        <Text style={styles.dateText}>{formatHkDateLabel(selectedDate, todayKey)}</Text>
        <TouchableOpacity
          onPress={() => onDateChange(dates[index + 1])}
          disabled={!canGoForward}
          hitSlop={10}
        >
          <ChevronRight size={18} color={canGoForward ? '#333' : '#C7C7CC'} />
        </TouchableOpacity>
      </View>

      <ExposureIoLegend />

      <FlatList
        ref={listRef}
        style={{ width: TREND_CHART_WIDTH }}
        data={dates}
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
  );
};

const styles = StyleSheet.create({
  title: { fontSize: 13, fontWeight: '700', color: '#1C1C1E', marginBottom: 6 },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  dateText: { fontSize: 13, fontWeight: '700', color: '#1C1C1E' },
  page: { width: TREND_CHART_WIDTH, height: TREND_CHART_BODY_HEIGHT },
  placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  placeholderText: { fontSize: 13, color: '#8E8E93', textAlign: 'center' },
});

export default ExposureHourlyPager;
