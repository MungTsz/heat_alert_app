import { HeatDataProvider, HeatPoint, Coordinates } from './types';
import { fetchHkoCurrentWeather } from '../../services/hkoApi';
import { calculateHeatIndexCelsius } from '../../utils/heatIndexUtils';

// HKO's Open Data API only publishes ONE relative-humidity reading for the
// whole territory (measured at the Observatory), so there's no real
// per-location heat index to compute yet. Every point gets the same current
// heat index; the small offset ring below just keeps the map's IDW overlay
// working (it needs more than one anchor point), mirroring the mock
// provider's coverage area.
const SAMPLE_OFFSETS = [
  { lat: 0, lng: 0 },
  { lat: 0.05, lng: 0.05 },
  { lat: 0.05, lng: -0.05 },
  { lat: -0.05, lng: 0.05 },
  { lat: -0.05, lng: -0.05 },
  { lat: 0.1, lng: 0 },
  { lat: -0.1, lng: 0 },
];

export const apiHeatProvider: HeatDataProvider = {
  getHeatPoints: async (center: Coordinates): Promise<HeatPoint[]> => {
    const { temperatureC, relativeHumidityPct } =
      await fetchHkoCurrentWeather();
    const heatIndexC = calculateHeatIndexCelsius(
      temperatureC,
      relativeHumidityPct,
    );

    return SAMPLE_OFFSETS.map((offset, i) => ({
      id: `hko-${i}`,
      latitude: center.latitude + offset.lat,
      longitude: center.longitude + offset.lng,
      temperature: heatIndexC,
    }));
  },
};
