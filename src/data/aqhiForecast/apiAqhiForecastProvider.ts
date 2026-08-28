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

// PRAISE-HK's get_data only provides 48 hours forecast from the current
// hour — real data can't be padded into 3 days like the mock did. This
// groups the flat 48-point response into however many calendar days it
// actually spans (typically 2-3, depending on the current hour).
export const apiAqhiForecastProvider: AqhiForecastProvider = {
  getForecast: async (center: Coordinates): Promise<AqhiDayForecast[]> => {
    const t0 = toHkTimestamp();
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
