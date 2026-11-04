import {
  describeFeelsLikeGap,
  formatHeatZoneRangeC,
  HEAT_INDEX_ZONES,
} from '../heatIndexUtils';

describe('describeFeelsLikeGap', () => {
  it('states how much hotter humidity makes it feel', () => {
    expect(describeFeelsLikeGap(31.2, 38.4, 1)).toBe(
      'Humidity makes it feel 7° hotter',
    );
  });

  it('uses the rounded, displayed numbers so the gap matches what is on screen', () => {
    // Shown as 25° vs 26° → 1°, even though the raw gap is only 0.6°
    expect(describeFeelsLikeGap(24.9, 25.5, 1)).toBe(
      'Humidity makes it feel 1° hotter',
    );
  });

  it('explains a heat index below air temperature as dry air', () => {
    expect(describeFeelsLikeGap(30, 28, 1)).toBe(
      'Dry air makes it feel 2° cooler',
    );
  });

  it('says nothing when the two numbers read the same', () => {
    expect(describeFeelsLikeGap(24.8, 24.8, 1)).toBeNull();
  });
});

describe('formatHeatZoneRangeC', () => {
  it('formats every NWS zone in whole °C', () => {
    expect(HEAT_INDEX_ZONES.map(formatHeatZoneRangeC)).toEqual([
      '52°C+',
      '39-52°C',
      '32-39°C',
      '27-32°C',
      '<27°C',
    ]);
  });
});
