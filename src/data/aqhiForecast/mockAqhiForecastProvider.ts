import {
  AqhiForecastProvider,
  AqhiDayForecast,
  HourlyAqhiPoint,
  Coordinates,
} from './types';

const START_HOUR = 6;
const END_HOUR = 20;
const DAY_PEAK_AQHI = [6, 7, 8];

const startOfDay = (date: Date): number => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

const generateDayPoints = (
  baseDate: Date,
  peakAqhi: number,
): HourlyAqhiPoint[] => {
  const points: HourlyAqhiPoint[] = [];
  const peakHour = 17;

  for (let hour = START_HOUR; hour <= END_HOUR; hour++) {
    const distanceFromPeak = hour - peakHour;
    const shape = Math.exp(-(distanceFromPeak * distanceFromPeak) / 20);
    const aqhi = 2 + (peakAqhi - 2) * shape;

    const pointDate = new Date(baseDate);
    pointDate.setHours(hour, 0, 0, 0);

    points.push({
      timestamp: pointDate.getTime(),
      time: `${hour.toString().padStart(2, '0')}:00`,
      aqhi: Math.round(aqhi * 10) / 10,
    });
  }
  return points;
};

export const generateAqhiDayForOffset = (
  dayOffset: number,
): AqhiDayForecast => {
  const today = new Date();
  const dayDate = new Date(today);
  dayDate.setDate(today.getDate() + dayOffset);
  const peak =
    dayOffset < DAY_PEAK_AQHI.length
      ? DAY_PEAK_AQHI[dayOffset]
      : DAY_PEAK_AQHI[DAY_PEAK_AQHI.length - 1];

  return {
    weekdayShort: dayDate.toLocaleDateString('en-US', { weekday: 'short' }),
    dayOfMonth: dayDate.getDate(),
    dateMs: startOfDay(dayDate),
    isToday: dayOffset === 0,
    points: generateDayPoints(dayDate, peak),
  };
};

export const generateMockAqhiDays = (
  _center: Coordinates,
): AqhiDayForecast[] => {
  return [0, 1, 2].map(generateAqhiDayForOffset);
};

export const mockAqhiForecastProvider: AqhiForecastProvider = {
  getForecast: async center => {
    await new Promise<void>(resolve => setTimeout(() => resolve(), 300));
    return generateMockAqhiDays(center);
  },
};
