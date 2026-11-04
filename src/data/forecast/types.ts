export type HourlyForecastPoint = {
  timestamp: number;
  time: string;
  heatIndex: number;
  // Air temperature for the same hour and place, drawn as a faint line under
  // the heat index so the gap between them (humidity's effect) is visible.
  // null when the API had no reading for that hour.
  temperature: number | null;
  // true = a measured hour, false = a forecast hour. "Now" is the last
  // observed point, not the phone's clock — the API's data lands an hour or
  // two late, and the chart/alerts must line up with the current-conditions
  // card, which also shows the latest observed hour.
  observed: boolean;
};

export type DayForecast = {
  weekdayShort: string; // "Mon", "Tue", etc.
  dayOfMonth: number; // 18, 19, etc.
  dateMs: number;
  isToday: boolean;
  points: HourlyForecastPoint[];
};

export type Coordinates = {
  latitude: number;
  longitude: number;
};

export interface ForecastDataProvider {
  getForecast: (center: Coordinates) => Promise<DayForecast[]>;
}

// Index of "now" within a day's points: the last observed hour, or -1 when
// the day has none (a fully-forecast future day).
export const lastObservedIndex = (points: HourlyForecastPoint[]): number => {
  for (let i = points.length - 1; i >= 0; i--) {
    if (points[i].observed) return i;
  }
  return -1;
};
