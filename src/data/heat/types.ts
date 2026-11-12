export type Coordinates = {
  latitude: number;
  longitude: number;
};

// Temperature, RH and heat index at one place for one data hour. All three
// come straight from the API — the heat index is never derived on-device,
// so every screen shows the same number the map and alerts are based on.
export type HeatConditions = {
  ts: string; // YYYYMMDDhh, HKT — the data hour, not the phone's clock
  temperatureC: number;
  relativeHumidityPct: number;
  heatIndexC: number;
};

// One data hour's value: the hour starting at timestampMs.
export type HourlyHeatIndex = { timestampMs: number; value: number };

// Contract every data source (mock or real) must follow
export interface HeatDataProvider {
  getConditionsAt: (coords: Coordinates) => Promise<HeatConditions>;
  // Heat index alone — one request instead of three, for lists of places
  // (bookmarks, alert checks, tapped map points) that only show heat index.
  getHeatIndexAt: (coords: Coordinates) => Promise<number>;
  // Past hourly heat index at one place, for the data hours from fromMs to
  // toMs — e.g. the highest heat index during today's stays at a place.
  // Hours the API hasn't produced yet are simply missing, never filled in.
  getHeatIndexHistoryAt: (
    coords: Coordinates,
    fromMs: number,
    toMs: number,
  ) => Promise<HourlyHeatIndex[]>;
}
