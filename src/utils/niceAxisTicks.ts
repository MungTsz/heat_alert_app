// src/utils/niceAxisTicks.ts
// Generic "nice numbers" tick calculation, shared by ExposureDailyBarChart
// and ExposureTrendChart's y-axes. Unlike AqhiHourlyForecastChart/
// DailyHeatForecastCard — which hardcode ticks because AQHI/heat-index have
// fixed, known domains — exposure totals (%AR·h) have no fixed range, so
// ticks have to be derived from whatever data is on screen.
export type NiceAxisTicks = { ticks: number[]; niceMax: number };

const NICE_STEP_FRACTIONS = [1, 2, 2.5, 5, 10];

export const niceAxisTicks = (maxValue: number, targetCount = 4): NiceAxisTicks => {
  if (maxValue <= 0) return { ticks: [0, 1], niceMax: 1 };

  const roughStep = maxValue / Math.max(1, targetCount - 1);
  const magnitude = 10 ** Math.floor(Math.log10(roughStep));
  const residual = roughStep / magnitude;
  const snapped = NICE_STEP_FRACTIONS.find(f => f >= residual) ?? 10;
  const niceStep = snapped * magnitude;
  const niceMax = Math.ceil(maxValue / niceStep) * niceStep;

  const ticks: number[] = [];
  for (let v = 0; v <= niceMax + niceStep / 2; v += niceStep) {
    ticks.push(Math.round(v * 1000) / 1000);
  }
  return { ticks, niceMax };
};
