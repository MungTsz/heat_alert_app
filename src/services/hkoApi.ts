import { HKO_CONFIG } from '../config/hkoConfig';

export type HkoCurrentWeather = {
  temperatureC: number;
  relativeHumidityPct: number;
};

export const fetchHkoCurrentWeather = async (): Promise<HkoCurrentWeather> => {
  const response = await fetch(
    `${HKO_CONFIG.baseUrl}?dataType=rhrread&lang=en`,
  );
  if (!response.ok) {
    throw new Error(`HKO rhrread request failed: ${response.status}`);
  }
  const data = await response.json();

  const stationTemp =
    data.temperature?.data?.find(
      (d: { place: string }) => d.place === HKO_CONFIG.station,
    ) ?? data.temperature?.data?.[0];
  const humidityReading = data.humidity?.data?.[0];

  if (!stationTemp || !humidityReading) {
    throw new Error('HKO rhrread response missing temperature/humidity data');
  }

  return {
    temperatureC: stationTemp.value,
    relativeHumidityPct: humidityReading.value,
  };
};
