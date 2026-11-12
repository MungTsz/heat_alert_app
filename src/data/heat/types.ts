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

// Contract every data source (mock or real) must follow
export interface HeatDataProvider {
  getConditionsAt: (coords: Coordinates) => Promise<HeatConditions>;
  // Heat index alone — one request instead of three, for lists of places
  // (bookmarks, alert checks, tapped map points) that only show heat index.
  getHeatIndexAt: (coords: Coordinates) => Promise<number>;
}
