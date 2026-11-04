// src/components/HeatHourlyForecastChart.tsx
import React, { useMemo } from 'react';
import { DayForecast, lastObservedIndex } from '../data/forecast/types';
import {
  HEAT_INDEX_ZONES,
  fahrenheitToCelsius,
  formatHeatZoneRangeC,
} from '../utils/heatIndexUtils';
import HourlyForecastChart, {
  ForecastChartBand,
  ForecastChartDay,
} from './HourlyForecastChart';

// Chart bounds in Celsius, with headroom below "Safe" and above "Extreme
// Danger" so every zone's band is visible even at the axis edges.
const VALUE_RANGE = { min: 15, max: 55 };

// Y-axis labels sit at each classification boundary (Fahrenheit thresholds
// from HEAT_INDEX_ZONES, converted to Celsius) rather than round numbers, so
// they line up with where the background bands actually change.
const Y_AXIS_LABELS = HEAT_INDEX_ZONES.slice(0, -1).map(z => {
  const value = Math.round(fahrenheitToCelsius(z.minF) * 10) / 10;
  return { value, label: `${Math.round(value)}°` };
});

const BANDS: ForecastChartBand[] = HEAT_INDEX_ZONES.map(zone => ({
  min:
    zone.minF === -Infinity ? VALUE_RANGE.min : fahrenheitToCelsius(zone.minF),
  max:
    zone.maxF === Infinity ? VALUE_RANGE.max : fahrenheitToCelsius(zone.maxF),
  color: zone.color,
  opacity: 0.55,
}));

// Safe → Extreme Danger, left to right, matching the AQHI chart's key order.
const LEGEND_ITEMS = [...HEAT_INDEX_ZONES].reverse().map(zone => ({
  label: zone.classification,
  range: formatHeatZoneRangeC(zone),
  color: zone.color,
}));

const formatCelsius = (value: number) => `${Math.round(value)}°C`;

// Both series named in full — "Heat index" and "Temperature" — since this is
// where people compare the two; short forms like "Air" read as jargon.
const PRIMARY = { label: 'Heat index', format: formatCelsius };
const SECONDARY = { label: 'Temperature', format: formatCelsius };

type Props = { days: DayForecast[] };

const HeatHourlyForecastChart: React.FC<Props> = ({ days }) => {
  const chartDays = useMemo(
    (): ForecastChartDay[] =>
      days.map(day => {
        // "Now" is the latest observed hour, not the phone's clock: API data
        // lands an hour or two late, and this keeps the marker equal to the
        // current-conditions card's value.
        const observed = lastObservedIndex(day.points);
        return {
          key: String(day.dateMs),
          weekdayShort: day.weekdayShort,
          dayOfMonth: day.dayOfMonth,
          isToday: day.isToday,
          nowIndex: day.isToday && observed >= 0 ? observed : null,
          points: day.points.map(p => ({
            timestamp: p.timestamp,
            hour: parseInt(p.time.slice(0, 2), 10),
            value: p.heatIndex,
            secondaryValue: p.temperature,
          })),
        };
      }),
    [days],
  );

  return (
    <HourlyForecastChart
      days={chartDays}
      valueRange={VALUE_RANGE}
      yAxisLabels={Y_AXIS_LABELS}
      bands={BANDS}
      legendItems={LEGEND_ITEMS}
      primary={PRIMARY}
      secondary={SECONDARY}
    />
  );
};

export default HeatHourlyForecastChart;
