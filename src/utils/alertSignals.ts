// src/utils/alertSignals.ts
import { ForecastWindow, HazardKind, PlaceAlertProfile } from '../types/alerts';
import { AllClearMode } from '../types/settings';
import { ALERT_EVENT_CONFIG } from '../config/alertConfig';
import { rankOf } from './hazardLevels';
import { alertEventKey, alertRankFor, urgentRankFor } from './alertProfile';

export type HourlyValue = { timestampMs: number; value: number };

// What the data layer knows about one hazard at one place right now.
export type HazardReading = {
  // Latest observed value; null = the lookup failed or isn't available.
  current: number | null;
  // Hourly forecast values; null = this hazard has no real forecast (heat
  // while the API has none, AQHI without PRAISE) or the fetch failed. Past
  // hours may be included — they're ignored here.
  forecast: HourlyValue[] | null;
};

// Everything the event state machine needs, already reduced to ranks so it
// never has to know which hazard it is looking at.
export type HazardSignal = {
  key: string;
  placeId: string;
  hazard: HazardKind;
  thresholdRank: number;
  urgentRank: number;
  currentValue: number | null;
  currentRank: number | null;
  // false when there is no forecast to judge by — the machine then neither
  // opens heads-ups nor cancels them, rather than reading "no data" as
  // "no breach".
  forecastAvailable: boolean;
  forecast: ForecastWindow | null;
  forecastBreachSoon: boolean;
  allClearWanted: boolean;
};

// The first run of consecutive future hours at or above the threshold,
// within the preview horizon.
export const findForecastWindow = (
  hazard: HazardKind,
  points: readonly HourlyValue[],
  thresholdRank: number,
  nowMs: number,
): ForecastWindow | null => {
  const horizonEnd = nowMs + ALERT_EVENT_CONFIG.previewHorizonMs;
  const future = points
    .filter(p => p.timestampMs > nowMs && p.timestampMs <= horizonEnd)
    .sort((a, b) => a.timestampMs - b.timestampMs);

  const firstIndex = future.findIndex(p => rankOf(hazard, p.value) >= thresholdRank);
  if (firstIndex < 0) return null;

  let lastIndex = firstIndex;
  while (
    lastIndex + 1 < future.length &&
    rankOf(hazard, future[lastIndex + 1].value) >= thresholdRank
  ) {
    lastIndex++;
  }

  const run = future.slice(firstIndex, lastIndex + 1);
  const values = run.map(p => p.value);
  const maxValue = Math.max(...values);
  return {
    startMs: run[0].timestampMs,
    endMs: run[run.length - 1].timestampMs + ALERT_EVENT_CONFIG.forecastStepMs,
    minValue: Math.min(...values),
    maxValue,
    peakRank: rankOf(hazard, maxValue),
  };
};

const wantsAllClear = (mode: AllClearMode, profile: PlaceAlertProfile): boolean =>
  mode === 'always' || (mode === 'auto' && profile.caringFor === 'family');

export const buildHazardSignal = (params: {
  placeId: string;
  hazard: HazardKind;
  profile: PlaceAlertProfile;
  reading: HazardReading;
  allClear: AllClearMode;
  nowMs: number;
}): HazardSignal => {
  const { placeId, hazard, profile, reading, allClear, nowMs } = params;
  const thresholdRank = alertRankFor(profile, hazard);
  const forecastPoints = reading.forecast;

  const forecast =
    forecastPoints === null
      ? null
      : findForecastWindow(hazard, forecastPoints, thresholdRank, nowMs);

  return {
    key: alertEventKey(placeId, hazard),
    placeId,
    hazard,
    thresholdRank,
    urgentRank: urgentRankFor(hazard),
    currentValue: reading.current,
    currentRank: reading.current === null ? null : rankOf(hazard, reading.current),
    forecastAvailable: forecastPoints !== null,
    forecast,
    forecastBreachSoon:
      forecast !== null &&
      forecast.startMs <= nowMs + ALERT_EVENT_CONFIG.clearForecastLookaheadMs,
    allClearWanted: wantsAllClear(allClear, profile),
  };
};
