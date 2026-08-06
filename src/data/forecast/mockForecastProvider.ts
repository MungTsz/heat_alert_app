import {
  ForecastDataProvider,
  DayForecast,
  HourlyForecastPoint,
  Coordinates,
} from './types';

const START_HOUR = 6;
const END_HOUR = 20;

// Demo trend: each day's peak is a bit hotter than the last, so the
// "sustained trend across days" rule has something real to detect.
const DAY_PEAK_TEMPS = [38, 41, 44];
const DAY_LABELS_FALLBACK = ['Today', 'Tomorrow'];

const weekdayLabel = (date: Date): string =>
  date.toLocaleDateString('en-US', { weekday: 'short' });

const generateDayPoints = (
  baseDate: Date,
  peakTemp: number,
): HourlyForecastPoint[] => {
  const points: HourlyForecastPoint[] = [];
  const peakHour = 13.5;

  for (let hour = START_HOUR; hour <= END_HOUR; hour++) {
    // Gaussian-ish curve centered on peakHour, floor around 21°C at the edges
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

export const generateMockDays = (_center: Coordinates): DayForecast[] => {
  const today = new Date();

  return DAY_PEAK_TEMPS.map((peakTemp, i) => {
    const dayDate = new Date(today);
    dayDate.setDate(today.getDate() + i);

    const dayLabel =
      i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : weekdayLabel(dayDate);

    return {
      dayLabel,
      isToday: i === 0,
      points: generateDayPoints(dayDate, peakTemp),
    };
  });
};

export const mockForecastProvider: ForecastDataProvider = {
  getForecast: async center => {
    await new Promise<void>(resolve => setTimeout(() => resolve(), 300));
    return generateMockDays(center);
  },
};
