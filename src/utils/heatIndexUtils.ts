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

// NWS Rothfusz regression (https://www.weather.gov/ama/heatindex), with the
// standard low/high-humidity corrections applied in the ranges where they
// matter — Hong Kong's typical 80-87°F / >85% RH afternoons hit the
// high-humidity correction often enough that skipping it would be inaccurate.
export const calculateHeatIndexCelsius = (
  tempCelsius: number,
  relativeHumidityPct: number,
): number => {
  const tempF = celsiusToFahrenheit(tempCelsius);
  const rh = relativeHumidityPct;

  const simpleHeatIndexF =
    0.5 * (tempF + 61 + (tempF - 68) * 1.2 + rh * 0.094);
  if ((simpleHeatIndexF + tempF) / 2 < 80) {
    return fahrenheitToCelsius(simpleHeatIndexF);
  }

  let heatIndexF =
    -42.379 +
    2.04901523 * tempF +
    10.14333127 * rh -
    0.22475541 * tempF * rh -
    0.00683783 * tempF * tempF -
    0.05481717 * rh * rh +
    0.00122874 * tempF * tempF * rh +
    0.00085282 * tempF * rh * rh -
    0.00000199 * tempF * tempF * rh * rh;

  if (rh < 13 && tempF >= 80 && tempF <= 112) {
    heatIndexF -=
      ((13 - rh) / 4) * Math.sqrt((17 - Math.abs(tempF - 95)) / 17);
  } else if (rh > 85 && tempF >= 80 && tempF <= 87) {
    heatIndexF += ((rh - 85) / 10) * ((87 - tempF) / 5);
  }

  return fahrenheitToCelsius(heatIndexF);
};

// Standard NWS Heat Index classification (Caution/Extreme Caution/Danger/Extreme
// Danger), plus a "Safe" tier below Caution — the single source of truth for
// classification/color/risk, shared by current-conditions displays and the
// hourly forecast chart's background bands (see DailyHeatForecastCard.tsx).
export const HEAT_INDEX_ZONES: {
  classification: string;
  color: string;
  risk: string;
  minF: number;
  maxF: number;
}[] = [
  {
    classification: 'Extreme Danger',
    color: '#E53232',
    risk: 'Heat stroke highly likely',
    minF: 125,
    maxF: Infinity,
  },
  {
    classification: 'Danger',
    color: '#E8590C',
    risk: 'Heat cramps or heat exhaustion likely, and heat stroke possible with prolonged exposure and/or physical activity',
    minF: 103,
    maxF: 125,
  },
  {
    classification: 'Extreme Caution',
    color: '#FDB827',
    risk: 'Heat stroke, heat cramps, or heat exhaustion possible with prolonged exposure and/or physical activity',
    minF: 90,
    maxF: 103,
  },
  {
    classification: 'Caution',
    color: '#F5E050',
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
