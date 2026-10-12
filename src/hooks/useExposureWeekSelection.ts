// src/hooks/useExposureWeekSelection.ts
import { useCallback, useState } from 'react';
import { DailyExposureEntry } from '../types/exposure';
import { getLastTrackedDate } from '../utils/exposureLastTrackedDate';
import { getHkWeekStartKey } from '../utils/hkDate';
import { WEEK_START_DAY } from '../config/exposureWeekChartConfig';

type WeekSelection = {
  // null = a week is showing but no single day is drilled into (after a
  // swipe, or after tapping the selected bar again to collapse it).
  selectedDate: string | null;
  weekStart: string;
};

// The week-pager + selected-day state shared by LiveDeviceDetailModal and
// DeviceDetailModal, so both screens follow the same interaction model:
// - untouched: the last tracked day (and its week) — recomputed as history
//   loads, rather than freezing whatever was known on the first render;
// - swiping to another week clears the day, so the map/hourly detail only
//   appears for a day the user actually tapped;
// - tapping a bar selects that day, tapping it again collapses it;
// - picking a date in the calendar jumps to its week with that day selected.
export const useExposureWeekSelection = (
  history: DailyExposureEntry[],
  todayKey: string,
  todayHasData: boolean,
) => {
  const [picked, setPicked] = useState<WeekSelection | null>(null);

  const defaultDate = getLastTrackedDate(history, todayKey, todayHasData);
  const selection: WeekSelection = picked ?? {
    selectedDate: defaultDate,
    weekStart: getHkWeekStartKey(defaultDate, WEEK_START_DAY),
  };

  const toggleDay = useCallback(
    (date: string) =>
      setPicked({
        selectedDate: date === selection.selectedDate ? null : date,
        weekStart: selection.weekStart,
      }),
    [selection.selectedDate, selection.weekStart],
  );

  const changeWeek = useCallback(
    (weekStart: string) => setPicked({ selectedDate: null, weekStart }),
    [],
  );

  const pickDate = useCallback(
    (date: string) =>
      setPicked({ selectedDate: date, weekStart: getHkWeekStartKey(date, WEEK_START_DAY) }),
    [],
  );

  return { ...selection, toggleDay, changeWeek, pickDate };
};
