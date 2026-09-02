import { calculateHeatIndexCelsius } from '../heatIndexUtils';

const cToF = (c: number) => (c * 9) / 5 + 32;

describe('calculateHeatIndexCelsius', () => {
  it('matches the NWS reference chart at 90°F / 70% RH (~105°F)', () => {
    const hiC = calculateHeatIndexCelsius(32.22, 70); // 32.22°C = 90°F
    expect(cToF(hiC)).toBeGreaterThan(103);
    expect(cToF(hiC)).toBeLessThan(107);
  });

  it('applies the high-humidity correction at 85°F / 90% RH (~102°F)', () => {
    const hiC = calculateHeatIndexCelsius(29.44, 90); // 29.44°C = 85°F
    expect(cToF(hiC)).toBeGreaterThan(100);
    expect(cToF(hiC)).toBeLessThan(104);
  });

  it('stays close to actual temperature in mild conditions (below the 80°F regression threshold)', () => {
    const hiC = calculateHeatIndexCelsius(25, 50); // 25°C, 50% RH — mild
    expect(hiC).toBeGreaterThan(22);
    expect(hiC).toBeLessThan(26);
  });
});
