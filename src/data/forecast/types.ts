export type HourlyForecastPoint = {
  timestamp: number;
  time: string; // "07:00"
  heatIndex: number;
};

export type DayForecast = {
  dayLabel: string; // "Today", "Tomorrow", "Wed"
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
