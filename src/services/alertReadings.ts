// src/services/alertReadings.ts
import { HazardKind } from '../types/alerts';
import { heatDataProvider } from '../data/heat';
import { forecastDataProvider } from '../data/forecast';
import { aqhiDataProvider } from '../data/aqhi';
import { aqhiForecastProvider } from '../data/aqhiForecast';
import { SPATIAL_TEMP_CONFIG } from '../config/spatialTempConfig';
import { isPraiseConfigured } from '../config/praiseConfig';
import { HazardReading, HourlyValue } from '../utils/alertSignals';

type Coordinates = { latitude: number; longitude: number };

const UNAVAILABLE: HazardReading = { current: null, forecast: null };

// A failed lookup becomes null (unknown) — never an estimate from another
// source — so a push alert always matches what the app shows.
const orNull = <T>(promise: Promise<T>, label: string): Promise<T | null> =>
  promise.catch(err => {
    console.log(`Alert ${label} fetch error:`, err);
    return null;
  });

// Rounded like every card shows them, so a reading on a level boundary
// classifies the same in the alert as on screen.
const round = (value: number | null) => (value === null ? null : Math.round(value));

const fetchHeatReading = async (coords: Coordinates): Promise<HazardReading> => {
  const [current, days] = await Promise.all([
    orNull(heatDataProvider.getHeatIndexAt(coords), 'heat index'),
    // While the "forecast" is history replayed as demo data, it must never
    // open a heads-up — heat events then start at "active", from readings.
    SPATIAL_TEMP_CONFIG.forecastFromHistory
      ? Promise.resolve(null)
      : orNull(forecastDataProvider.getForecast(coords), 'heat forecast'),
  ]);
  const forecast: HourlyValue[] | null =
    days === null
      ? null
      : days.flatMap(day =>
          day.points
            .filter(p => !p.observed)
            .map(p => ({ timestampMs: p.timestamp, value: p.heatIndex })),
        );
  return { current: round(current), forecast };
};

const fetchAqhiReading = async (coords: Coordinates): Promise<HazardReading> => {
  // Without PRAISE the AQHI providers serve mock data — fine for the map,
  // never for a push notification.
  if (!isPraiseConfigured()) return UNAVAILABLE;
  const [current, days] = await Promise.all([
    orNull(aqhiDataProvider.getAqhiAt(coords), 'AQHI'),
    orNull(aqhiForecastProvider.getForecast(coords), 'AQHI forecast'),
  ]);
  const forecast: HourlyValue[] | null =
    days === null
      ? null
      : days.flatMap(day => day.points.map(p => ({ timestampMs: p.timestamp, value: p.aqhi })));
  return { current: round(current), forecast };
};

export const fetchPlaceReadings = async (
  coords: Coordinates,
  hazards: Record<HazardKind, boolean>,
): Promise<Record<HazardKind, HazardReading>> => {
  const [heat, aqhi] = await Promise.all([
    hazards.heat ? fetchHeatReading(coords) : Promise.resolve(UNAVAILABLE),
    hazards.aqhi ? fetchAqhiReading(coords) : Promise.resolve(UNAVAILABLE),
  ]);
  return { heat, aqhi };
};
