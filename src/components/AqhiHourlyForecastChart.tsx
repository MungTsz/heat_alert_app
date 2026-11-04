// src/components/AqhiHourlyForecastChart.tsx
import React, { useMemo } from 'react';
import { AqhiDayForecast } from '../data/aqhiForecast/types';
import { formatAqhiValue } from '../utils/aqhiUtils';
import HourlyForecastChart, {
  ForecastChartBand,
  ForecastChartDay,
} from './HourlyForecastChart';

const VALUE_RANGE = { min: 0, max: 11 }; // top band is "10+"

const Y_AXIS_LABELS = [
  ...[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(v => ({ value: v, label: `${v}` })),
  { value: 11, label: '10+' },
];

// Fixed EPD severity bands — background zones, not per-point colors. This is
// a deliberately independent, coarser 5-color palette for the chart backdrop,
// separate from aqhiUtils' per-value gradient used by the map/legend/pins.
const BANDS: ForecastChartBand[] = [
  { min: 0, max: 3, color: '#4CAF33', opacity: 0.55 }, // Low
  { min: 3, max: 6, color: '#F2C300', opacity: 0.55 }, // Moderate
  { min: 6, max: 7, color: '#E8242A', opacity: 0.55 }, // High
  { min: 7, max: 10, color: '#8D4A3C', opacity: 0.55 }, // Very High
  { min: 10, max: 11, color: '#000000', opacity: 0.85 }, // Serious ("10+")
];

const LEGEND = [
  { label: 'Low', range: '1  2  3', color: '#4CAF33' },
  { label: 'Moderate', range: '4  5  6', color: '#F2C300' },
  { label: 'High', range: '7', color: '#E8242A' },
  { label: 'Very High', range: '8  9  10', color: '#8D4A3C' },
  { label: 'Serious', range: '10+', color: '#000000' },
];

const PRIMARY = { label: 'AQHI', format: formatAqhiValue };

type Props = { days: AqhiDayForecast[]; loading?: boolean };

const AqhiHourlyForecastChart: React.FC<Props> = ({ days, loading }) => {
  const chartDays = useMemo((): ForecastChartDay[] => {
    // AQHI's forecast is anchored on the phone's clock, so "now" is today's
    // point closest to the current time.
    const now = Date.now();
    return days.map(day => ({
      key: String(day.dateMs),
      weekdayShort: day.weekdayShort,
      dayOfMonth: day.dayOfMonth,
      isToday: day.isToday,
      nowIndex:
        day.isToday && day.points.length > 0
          ? day.points.reduce(
              (closest, p, i) =>
                Math.abs(p.timestamp - now) <
                Math.abs(day.points[closest].timestamp - now)
                  ? i
                  : closest,
              0,
            )
          : null,
      points: day.points.map(p => ({
        timestamp: p.timestamp,
        hour: parseInt(p.time.slice(0, 2), 10),
        value: p.aqhi,
      })),
    }));
  }, [days]);

  return (
    <HourlyForecastChart
      days={chartDays}
      valueRange={VALUE_RANGE}
      yAxisLabels={Y_AXIS_LABELS}
      bands={BANDS}
      legendItems={LEGEND}
      primary={PRIMARY}
      loading={loading}
    />
  );
};

export default AqhiHourlyForecastChart;
