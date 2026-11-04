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
}
