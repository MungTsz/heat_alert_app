// src/components/DayTabRow.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

// Generic version of the day-selector row already duplicated between
// AqhiHourlyForecastChart.tsx and DailyHeatForecastCard.tsx (weekday +
// circled day-of-month). Extracted here rather than adding a third copy,
// since this feature needs it in two places (the daily history picker, and
// each multi-day import's internal day-tabs).

export const ALL_DAYS_KEY = '__all__';

export type DayTabItem = {
  key: string;
  weekdayShort: string;
  dayOfMonth: string | number;
};

type Props = {
  days: DayTabItem[];
  selectedKey: string;
  onSelect: (key: string) => void;
  // An optional leading pseudo-tab (key: ALL_DAYS_KEY) for viewing every day
  // in a multi-day import at once, alongside browsing them individually.
  leadingLabel?: string;
  accentColor?: string;
};

const DayTabRow: React.FC<Props> = ({
  days,
  selectedKey,
  onSelect,
  leadingLabel,
  accentColor = '#8B5CF6',
}) => {
  const allItems: (DayTabItem | { key: string; label: string })[] = leadingLabel
    ? [{ key: ALL_DAYS_KEY, label: leadingLabel }, ...days]
    : days;

  return (
    <View style={styles.dayTabRow}>
      {allItems.map(item => {
        const isSelected = selectedKey === item.key;
        const isLeading = 'label' in item;
        return (
          <TouchableOpacity
            key={item.key}
            style={styles.dayTab}
            onPress={() => onSelect(item.key)}
          >
            <Text
              style={[
                styles.weekdayText,
                isSelected && { color: accentColor },
              ]}
            >
              {isLeading ? '' : (item as DayTabItem).weekdayShort}
            </Text>
            <View
              style={[
                styles.dayCircle,
                isSelected && { backgroundColor: accentColor },
              ]}
            >
              <Text
                style={[
                  styles.dayNumberText,
                  isSelected && styles.dayNumberTextActive,
                  isLeading && styles.allLabelText,
                ]}
              >
                {isLeading ? item.label : (item as DayTabItem).dayOfMonth}
              </Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  dayTabRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 18,
    paddingHorizontal: 4,
    marginBottom: 12,
  },
  dayTab: { alignItems: 'center', gap: 6 },
  weekdayText: { fontSize: 12, fontWeight: '600', color: '#A0AEC0' },
  dayCircle: {
    minWidth: 34,
    height: 34,
    paddingHorizontal: 6,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayNumberText: { fontSize: 16, fontWeight: '700', color: '#2D3748' },
  dayNumberTextActive: { color: '#FFFFFF' },
  allLabelText: { fontSize: 12 },
});

export default DayTabRow;
