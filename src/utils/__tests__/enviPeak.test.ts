import { todaysPeakLevel } from '../enviPeak';
import { DayForecast } from '../../data/forecast/types';
import { AqhiDayForecast } from '../../data/aqhiForecast/types';

const HOUR = 60 * 60 * 1000;
const NOW = Date.UTC(2026, 7, 15, 4); // noon HKT

const dayBase = { weekdayShort: 'Sat', dayOfMonth: 15, dateMs: NOW, isToday: true };

// Heat points: the given values hourly from 2 h ago; the first `observed`
// points are measured, the rest forecast.
const heatDay = (values: number[], observed: number): DayForecast => ({
  ...dayBase,
  points: values.map((heatIndex, i) => ({
    timestamp: NOW + (i - 2) * HOUR,
    time: '',
    heatIndex,
    temperature: null,
    observed: i < observed,
  })),
});

const aqhiDay = (values: number[]): AqhiDayForecast => ({
  ...dayBase,
  points: values.map((aqhi, i) => ({ timestamp: NOW + (i - 2) * HOUR, time: '', aqhi })),
});

describe('todaysPeakLevel', () => {
  it('is the highest level still to come today, from either hazard', () => {
    // Heat reaches Danger (4) later today.
    expect(
      todaysPeakLevel({
        heatDays: [heatDay([30, 30, 30, 45], 3)],
        aqhiDays: [aqhiDay([2, 2, 2, 2])],
        nowLevel: 2,
        nowMs: NOW,
      }),
    ).toBe(4);
    // AQHI reaches Very High (4) while heat stays at Caution.
    expect(
      todaysPeakLevel({
        heatDays: [heatDay([30, 30, 30, 30], 3)],
        aqhiDays: [aqhiDay([2, 2, 2, 9])],
        nowLevel: 2,
        nowMs: NOW,
      }),
    ).toBe(4);
  });

  it('ignores hours already past', () => {
    // The Danger hour was 2 h ago, before the last observed hour.
    expect(
      todaysPeakLevel({
        heatDays: [heatDay([45, 30, 30, 30], 3)],
        aqhiDays: [aqhiDay([9, 2, 2, 2])],
        nowLevel: 2,
        nowMs: NOW,
      }),
    ).toBeNull();
  });

  it('is null when the peak is not above now, or there is no level now', () => {
    const days = {
      heatDays: [heatDay([30, 30, 30, 30], 3)],
      aqhiDays: [aqhiDay([2, 2, 2, 2])],
      nowMs: NOW,
    };
    expect(todaysPeakLevel({ ...days, nowLevel: 2 })).toBeNull();
    expect(todaysPeakLevel({ ...days, nowLevel: null })).toBeNull();
  });

  it('is null with no forecast at all', () => {
    expect(
      todaysPeakLevel({
        heatDays: [],
        aqhiDays: [],
        nowLevel: 2,
        nowMs: NOW,
      }),
    ).toBeNull();
  });
});
