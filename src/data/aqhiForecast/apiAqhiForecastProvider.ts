// src/data/aqhiForecast/apiAqhiForecastProvider.ts
import {
  AqhiForecastProvider,
  AqhiDayForecast,
  HourlyAqhiPoint,
  Coordinates,
} from './types';
import { fetchPraisePointData, toHkTimestamp } from '../../services/praiseApi';

const startOfDay = (date: Date): number => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

// Midnight of today, in Hong Kong time — this is what makes "today" include
// the full 0:00-current-hour history, not just current-hour-forward.
const startOfTodayHkDate = (): Date => {
  const now = new Date();
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
  const hkNow = new Date(utcMs + 8 * 60 * 60 * 1000);
  hkNow.setHours(0, 0, 0, 0);
  return hkNow;
};

export const apiAqhiForecastProvider: AqhiForecastProvider = {
  getForecast: async (center: Coordinates): Promise<AqhiDayForecast[]> => {
    // t0 = start of today (HKT) instead of the current hour — pulls in
    // today's past hours as well as the forecast ahead.
    const t0Date = startOfTodayHkDate();
    const t0 = toHkTimestamp(t0Date);

    // t1 = 48 hours forward from NOW (not from t0), matching the API's own
    // "48 hours forecast from current hour" ceiling — we're just also asking
    // for the hours behind us today, not extending how far ahead we can see.
    const t1End = new Date();
    t1End.setHours(t1End.getHours() + 48);
    const t1 = toHkTimestamp(t1End);

    const data = await fetchPraisePointData(
      center.latitude,
      center.longitude,
      t0,
      t1,
      ['AQHIBN2024'],
    );

    const isots = data.isots ?? [];
    const values = data.AQHIBN2024 ?? [];

    const today = new Date();
    const todayStart = startOfDay(today);

    const dayMap = new Map<number, HourlyAqhiPoint[]>();

    isots.forEach((iso: string, i: number) => {
      const date = new Date(iso);
      const dayKey = startOfDay(date);
      const point: HourlyAqhiPoint = {
        timestamp: date.getTime(),
        time: `${date.getHours().toString().padStart(2, '0')}:00`,
        aqhi: values[i],
      };
      if (!dayMap.has(dayKey)) dayMap.set(dayKey, []);
      dayMap.get(dayKey)!.push(point);
    });

    const days: AqhiDayForecast[] = Array.from(dayMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([dayKey, points]) => {
        const date = new Date(dayKey);
        return {
          weekdayShort: date.toLocaleDateString('en-US', { weekday: 'short' }),
          dayOfMonth: date.getDate(),
          dateMs: dayKey,
          isToday: dayKey === todayStart,
          points,
        };
      });

    return days;
  },
};
