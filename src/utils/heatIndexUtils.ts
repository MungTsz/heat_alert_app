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
// Danger), plus a "Safe" tier below Caution — the single source of truth for
// classification/color/risk, shared by current-conditions displays, map pins,
// alert messages and the hourly forecast chart's background bands (see
// DailyHeatForecastCard.tsx). Colors and risk text are taken verbatim from
// the NWS reference table the project follows (colors pixel-sampled from it);
// "Safe" isn't in that table, so it keeps the app's own blue.
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
    classification: 'Safe',
    color: '#5DADE2',
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
