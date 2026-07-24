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
