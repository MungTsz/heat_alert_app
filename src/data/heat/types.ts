export type HeatPoint = {
  id: string;
  latitude: number;
  longitude: number;
  temperature: number; // Celsius
};

export type Coordinates = {
  latitude: number;
  longitude: number;
};

// Contract every data source (mock or real) must follow
export interface HeatDataProvider {
  getHeatPoints: (center: Coordinates) => Promise<HeatPoint[]>;
}
