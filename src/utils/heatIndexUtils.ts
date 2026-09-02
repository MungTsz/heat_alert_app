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

const fahrenheitToCelsius = (fahrenheit: number): number => {
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

export const getHeatIndexInfo = (tempCelsius: number): HeatIndexInfo => {
  const tempF = celsiusToFahrenheit(tempCelsius);

  if (tempF > 130) {
    return {
      classification: 'Extremely Hot',
      color: '#DF7C8D',
      risk: 'Heat/Sunstroke Highly Likely',
    }; // Pink/Red
  } else if (tempF >= 105) {
    return {
      classification: 'Very Hot',
      color: '#E99066',
      risk: 'Sunstroke/Heat Exhaustion Likely',
    }; // Orange
  } else if (tempF >= 90) {
    return {
      classification: 'Hot',
      color: '#F0B96D',
      risk: 'Sunstroke/Heat Exhaustion Possible',
    }; // Light Orange
  } else if (tempF >= 80) {
    return {
      classification: 'Very Warm',
      color: '#F4D97A',
      risk: 'Fatigue Possible',
    }; // Yellow
  } else {
    return {
      classification: 'Neutral',
      color: '#87C693',
      risk: 'Heat/Sunstroke Unlikely',
    }; // Green
  }
};
