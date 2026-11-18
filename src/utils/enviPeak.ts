// src/utils/enviPeak.ts
import { AqhiDayForecast } from '../data/aqhiForecast/types';
import { DayForecast, lastObservedIndex } from '../data/forecast/types';
import { SPATIAL_TEMP_CONFIG } from '../config/spatialTempConfig';
import { getEnviLevel } from './enviUtils';

// How far back an AQHI forecast hour still counts as "the rest of today":
// the AQHI forecast is hourly and anchored on the phone's clock, so the
// current hour's point can be up to an hour old.
const AQHI_CURRENT_HOUR_MS = 60 * 60 * 1000;

const maxOf = (values: number[]): number | null =>
  values.length === 0 ? null : Math.max(...values);

// The highest Environmental Index level still to come today, for the band's
// dashed "Today's peak" arrow. null — no arrow — when:
// - the heat forecast is not real yet (forecastFromHistory: future hours
//   repeat the reading from 48 h earlier, and a made-up peak must never
//   reach the screen);
// - there is no current level, or the peak is not above it (a "peak" at or
//   below now tells the user nothing).
// Each hazard's rest-of-day maximum is taken first; since a level only
// rises with its value, the index of those maxima is the highest hourly
// index of the day.
export const todaysPeakLevel = (params: {
  heatDays: DayForecast[];
  aqhiDays: AqhiDayForecast[];
  nowLevel: number | null;
  nowMs: number;
  forecastFromHistory?: boolean;
}): number | null => {
  const {
    heatDays,
    aqhiDays,
    nowLevel,
    nowMs,
    forecastFromHistory = SPATIAL_TEMP_CONFIG.forecastFromHistory,
  } = params;
  if (forecastFromHistory || nowLevel === null) return null;

  // Heat: from the last observed hour ("now", which the API's data sets,
  // not the phone's clock) to the end of today.
  const heatToday = heatDays.find(day => day.isToday)?.points ?? [];
  const heatFrom = Math.max(lastObservedIndex(heatToday), 0);
  const heatPeak = maxOf(heatToday.slice(heatFrom).map(p => p.heatIndex));

  const aqhiToday = aqhiDays.find(day => day.isToday)?.points ?? [];
  const aqhiPeak = maxOf(
    aqhiToday.filter(p => p.timestamp >= nowMs - AQHI_CURRENT_HOUR_MS).map(p => p.aqhi),
  );

  const peak = getEnviLevel({ heat: heatPeak, aqhi: aqhiPeak });
  return peak !== null && peak > nowLevel ? peak : null;
};
