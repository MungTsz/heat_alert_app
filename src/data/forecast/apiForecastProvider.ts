import { ForecastDataProvider } from './types';

const API_BASE_URL = 'https://your-backend.example.com'; // update when ready

export const apiForecastProvider: ForecastDataProvider = {
  getForecast: async center => {
    const response = await fetch(
      `${API_BASE_URL}/forecast?lat=${center.latitude}&lng=${center.longitude}`,
    );
    if (!response.ok)
      throw new Error(`Failed to fetch forecast: ${response.status}`);
    return response.json();
  },
};
