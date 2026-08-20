export type HourlyAqhiPoint = {
  timestamp: number;
  time: string;
  aqhi: number;
};

export type AqhiDayForecast = {
  weekdayShort: string;
  dayOfMonth: number;
  dateMs: number;
  isToday: boolean;
  points: HourlyAqhiPoint[];
};

export type Coordinates = {
  latitude: number;
  longitude: number;
};

export interface AqhiForecastProvider {
  getForecast: (center: Coordinates) => Promise<AqhiDayForecast[]>;
}
