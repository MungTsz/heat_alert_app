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
  getAqhiPoints: (center: Coordinates) => Promise<AqhiPoint[]>;
}
