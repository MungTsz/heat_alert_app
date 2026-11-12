export type AqhiPoint = {
  id: string;
  latitude: number;
  longitude: number;
  aqhi: number;
};

export type Coordinates = {
  latitude: number;
  longitude: number;
};

export interface AqhiDataProvider {
  // A ring of samples around center — for the map's IDW overlay.
  getAqhiPoints: (center: Coordinates) => Promise<AqhiPoint[]>;
  // AQHI at exactly this place for the current hour — the per-place peer of
  // heat's getHeatIndexAt, for lists of places (bookmarks, alert checks).
  // A sample ring around the user's own position can't stand in for a place
  // across town, and the card and its alert must show the same number.
  getAqhiAt: (coords: Coordinates) => Promise<number>;
  // Past hourly AQHI at one place, for the hours from fromMs to toMs — the
  // peer of heat's getHeatIndexHistoryAt (e.g. the highest AQHI during
  // today's stays at a place).
  getAqhiHistoryAt: (coords: Coordinates, fromMs: number, toMs: number) => Promise<HourlyAqhi[]>;
}

// One hour's value: the hour starting at timestampMs.
export type HourlyAqhi = { timestampMs: number; value: number };
