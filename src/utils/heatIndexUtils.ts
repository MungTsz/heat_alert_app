// src/utils/heatIndexUtils.ts

export interface HeatIndexInfo {
  classification: string;
  color: string;
  risk: string;
}

// Helper to convert Celsius to Fahrenheit for the chart's logic
export const celsiusToFahrenheit = (celsius: number): number => {
  return (celsius * 9) / 5 + 32;
};

export const fahrenheitToCelsius = (fahrenheit: number): number => {
  return ((fahrenheit - 32) * 5) / 9;
};

// Standard NWS Heat Index classification (Caution/Extreme Caution/Danger/Extreme
// Danger), plus a "No Caution" tier below Caution — the single source of truth
// for classification/color/risk, shared by current-conditions displays, map
// pins, alert messages and the hourly forecast chart's background bands (see
// HeatHourlyForecastChart.tsx). Colors and risk text are taken verbatim from
// the NWS reference table the project follows (colors pixel-sampled from it).
// "No Caution" isn't in that table: its green is pixel-sampled from the
// Spatial Temperature API's own map PNG (/heat-index/area), so the in-app
// legend, chart and cards match the server-rendered map layer. It is named
// "No Caution" rather than "Safe" — below 27°C NWS issues no caution, which
// is not a promise that heat can't harm anyone.
export const HEAT_INDEX_ZONES: {
  classification: string;
  color: string;
  risk: string;
  minF: number;
  maxF: number;
}[] = [
  {
    classification: 'Extreme Danger',
    color: '#CC0003',
    risk: 'Heat stroke highly likely',
    minF: 125,
    maxF: Infinity,
  },
  {
    classification: 'Danger',
    color: '#FB6600',
    risk: 'Heat cramps or heat exhaustion likely, and heat stroke possible with prolonged exposure and/or physical activity',
    minF: 103,
    maxF: 125,
  },
  {
    classification: 'Extreme Caution',
    color: '#FDD015',
    risk: 'Heat stroke, heat cramps, or heat exhaustion possible with prolonged exposure and/or physical activity',
    minF: 90,
    maxF: 103,
  },
  {
    classification: 'Caution',
    color: '#FFFF99',
    risk: 'Fatigue possible with prolonged exposure and/or physical activity',
    minF: 80,
    maxF: 90,
  },
  {
    classification: 'No Caution',
    color: '#009933',
    risk: 'Heat/Sunstroke unlikely',
    minF: -Infinity,
    maxF: 80,
  },
];

export const getHeatIndexInfo = (tempCelsius: number): HeatIndexInfo => {
  const tempF = celsiusToFahrenheit(tempCelsius);
  const zone =
    HEAT_INDEX_ZONES.find(z => tempF >= z.minF && tempF < z.maxF) ??
    HEAT_INDEX_ZONES[HEAT_INDEX_ZONES.length - 1];
  return {
    classification: zone.classification,
    color: zone.color,
    risk: zone.risk,
  };
};

// A level's zone by its name — for UI that starts from a level (settings
// toggles, multi-day alerts) rather than a measured value, so it never needs
// a made-up sample temperature to look up the color/risk.
export const getHeatZoneByClassification = (classification: string) =>
  HEAT_INDEX_ZONES.find(z => z.classification === classification) ??
  HEAT_INDEX_ZONES[HEAT_INDEX_ZONES.length - 1];

// A zone's range in whole °C ("<27°C", "27-32°C", "52°C+") — one formatter
// for every legend (forecast chart, map, heat index explainer) so they never
// round the NWS °F thresholds differently.
export const formatHeatZoneRangeC = (zone: {
  minF: number;
  maxF: number;
}): string => {
  const toC = (f: number) => Math.round(fahrenheitToCelsius(f));
  if (zone.minF === -Infinity) return `<${toC(zone.maxF)}°C`;
  if (zone.maxF === Infinity) return `${toC(zone.minF)}°C+`;
  return `${toC(zone.minF)}-${toC(zone.maxF)}°C`;
};

// The one-line "why the two numbers differ" message shown next to air
// temperature. Works on the rounded values the user actually sees, so the
// stated gap always equals the difference between the two displayed numbers.
// null when the gap is too small to be worth mentioning.
export const describeFeelsLikeGap = (
  airTempC: number,
  heatIndexC: number,
  minGapC: number,
): string | null => {
  const gap = Math.round(heatIndexC) - Math.round(airTempC);
  if (gap >= minGapC) return `Humidity makes it feel ${gap}° hotter`;
  if (gap <= -minGapC) return `Dry air makes it feel ${-gap}° cooler`;
  return null;
};
