import {
  enviForecastSupported,
  enviMapLegendEntries,
  enviTileSource,
  pinEnviLevel,
} from '../enviMapLayer';
import { hexToRgba } from '../color';
import { ENVI_LEVELS } from '../../config/enviConfig';

// Heat index (°C): 25 No Caution (1), 35 Extreme Caution (3), 45 Danger (4).
// AQHI: 2 Low (1), 5 Moderate (2), 9 Very High (4).
describe('pinEnviLevel', () => {
  it('is the higher hazard level with both readings', () => {
    expect(pinEnviLevel({ heatIndex: 35, aqhi: 2 })).toBe(3);
    expect(pinEnviLevel({ heatIndex: 25, aqhi: 9 })).toBe(4);
  });

  it("is the other hazard's level with one reading missing", () => {
    expect(pinEnviLevel({ heatIndex: 45, aqhi: null })).toBe(4);
    expect(pinEnviLevel({ heatIndex: null, aqhi: 5 })).toBe(2);
  });

  it('is null ("--") with both readings missing', () => {
    expect(pinEnviLevel({ heatIndex: null, aqhi: null })).toBeNull();
  });
});

describe('enviTileSource', () => {
  it('borrows the AQHI tile in the demo, and has nothing without PRAISE', () => {
    expect(enviTileSource('aqhi-demo', true)).toBe('aqhi');
    expect(enviTileSource('aqhi-demo', false)).toBeNull();
  });

  it('uses the index tile once one exists', () => {
    expect(enviTileSource('tile', true)).toBe('tile');
    expect(enviTileSource('tile', false)).toBe('tile');
  });
});

describe('enviForecastSupported', () => {
  it('has no frames in the AQHI demo', () => {
    expect(enviForecastSupported('aqhi-demo')).toBe(false);
  });

  it('has frames with a real index tile', () => {
    expect(enviForecastSupported('tile')).toBe(true);
  });
});

describe('enviMapLegendEntries', () => {
  it('takes every level, name and colour from ENVI_LEVELS, worst first', () => {
    const entries = enviMapLegendEntries(1);
    expect(entries.map(e => e.level)).toEqual([5, 4, 3, 2, 1]);
    entries.forEach(entry => {
      const source = ENVI_LEVELS.find(l => l.level === entry.level)!;
      expect(entry.name).toBe(source.name);
      expect(entry.swatchColor).toBe(hexToRgba(source.color, 1));
    });
  });

  it("shows each colour at the layer's opacity", () => {
    const entries = enviMapLegendEntries(0.55);
    expect(entries[entries.length - 1].swatchColor).toBe(hexToRgba(ENVI_LEVELS[0].color, 0.55));
  });
});

describe('hexToRgba', () => {
  it('converts #RRGGBB with an alpha', () => {
    expect(hexToRgba('#4CAF33', 0.5)).toBe('rgba(76, 175, 51, 0.5)');
  });
});
