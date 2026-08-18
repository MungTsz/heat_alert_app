import {
  ForecastDataProvider,
  DayForecast,
  HourlyForecastPoint,
  Coordinates,
} from './types';

const START_HOUR = 6;
const END_HOUR = 20;

const DAY_PEAK_TEMPS = [38, 41, 44];

const startOfDay = (date: Date): number => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

const generateDayPoints = (
  baseDate: Date,
  peakTemp: number,
): HourlyForecastPoint[] => {
  const points: HourlyForecastPoint[] = [];
  const peakHour = 13.5;

  for (let hour = START_HOUR; hour <= END_HOUR; hour++) {
    const distanceFromPeak = hour - peakHour;
    const shape = Math.exp(-(distanceFromPeak * distanceFromPeak) / 30);
    const heatIndex = 21 + (peakTemp - 21) * shape;

    const pointDate = new Date(baseDate);
    pointDate.setHours(hour, 0, 0, 0);

    points.push({
      timestamp: pointDate.getTime(),
      time: `${hour.toString().padStart(2, '0')}:00`,
      heatIndex: Math.round(heatIndex * 10) / 10,
    });
  }
  return points;
};

const peakTempForOffset = (dayOffset: number): number => {
  if (dayOffset < DAY_PEAK_TEMPS.length) return DAY_PEAK_TEMPS[dayOffset];
  const base = DAY_PEAK_TEMPS[DAY_PEAK_TEMPS.length - 1];
  const wave = Math.sin(dayOffset * 0.7) * 4;
  return Math.round((base + wave) * 10) / 10;
};

export const generateDayForOffset = (dayOffset: number): DayForecast => {
  const today = new Date();
  const dayDate = new Date(today);
  dayDate.setDate(today.getDate() + dayOffset);

  return {
    weekdayShort: dayDate.toLocaleDateString('en-US', { weekday: 'short' }),
    dayOfMonth: dayDate.getDate(),
    dateMs: startOfDay(dayDate),
    isToday: dayOffset === 0,
    points: generateDayPoints(dayDate, peakTempForOffset(dayOffset)),
  };
};

export const generateMockDays = (_center: Coordinates): DayForecast[] => {
  return [0, 1, 2].map(generateDayForOffset);
};

export const mockForecastProvider: ForecastDataProvider = {
  getForecast: async center => {
    await new Promise<void>(resolve => setTimeout(() => resolve(), 300));
    return generateMockDays(center);
  },
};
