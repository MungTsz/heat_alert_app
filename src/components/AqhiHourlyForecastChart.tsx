// src/components/AqhiHourlyForecastChart.tsx
import React, { useMemo } from 'react';
import { AqhiDayForecast } from '../data/aqhiForecast/types';
import { formatAqhiValue } from '../utils/aqhiUtils';
import { ENVI_LEVELS } from '../config/enviConfig';
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
// The five colors themselves come from ENVI_LEVELS (ENVI adopted this
// palette), so they are written down once; what stays here is where each
// band sits on the AQHI axis, lowest level first like ENVI_LEVELS.
const BAND_SPANS = [
  { min: 0, max: 3, opacity: 0.55, label: 'Low', range: '1  2  3' },
  { min: 3, max: 6, opacity: 0.55, label: 'Moderate', range: '4  5  6' },
  { min: 6, max: 7, opacity: 0.55, label: 'High', range: '7' },
  { min: 7, max: 10, opacity: 0.55, label: 'Very High', range: '8  9  10' },
  { min: 10, max: 11, opacity: 0.85, label: 'Serious', range: '10+' },
];

const BANDS: ForecastChartBand[] = BAND_SPANS.map(({ min, max, opacity }, i) => ({
  min,
  max,
  color: ENVI_LEVELS[i].color,
  opacity,
}));

const LEGEND = BAND_SPANS.map(({ label, range }, i) => ({
  label,
  range,
  color: ENVI_LEVELS[i].color,
}));

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
