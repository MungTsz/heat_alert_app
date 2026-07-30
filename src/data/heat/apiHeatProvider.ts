import { HeatDataProvider } from './types';

const API_BASE_URL = 'https://your-backend.example.com'; // 👈 update when ready

export const apiHeatProvider: HeatDataProvider = {
  getHeatPoints: async center => {
    const response = await fetch(
      `${API_BASE_URL}/heat-points?lat=${center.latitude}&lng=${center.longitude}`,
    );
    if (!response.ok) {
      throw new Error(`Failed to fetch heat data: ${response.status}`);
    }
    return response.json();
  },
};
