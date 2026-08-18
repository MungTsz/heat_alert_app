export type HourlyForecastPoint = {
  timestamp: number;
  time: string;
  heatIndex: number;
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
