export type HourlyForecastPoint = {
  timestamp: number;
  time: string;
  heatIndex: number;
  // Air temperature for the same hour and place, drawn as a faint line under
  // the heat index so the gap between them (humidity's effect) is visible.
  // null when the API had no reading for that hour.
  temperature: number | null;
  // true = the current hour or earlier, false = a forecast hour. The last
  // observed point is "now" — the current HK hour (currentDataHour), the
  // same hour the current-conditions card shows, so chart and card agree.
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
