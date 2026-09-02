import { getHeatIndexInfo } from './heatIndexUtils';

export type SkyPalette = {
  topColor: string;
  bottomColor: string;
  sunColor: string;
  lawnColor: string;
  hazeIntensity: number; // 0–1, reserved for Stage 2's GLSL/SkSL shader
};

export const getSkyPalette = (tempCelsius: number): SkyPalette => {
  const { classification } = getHeatIndexInfo(tempCelsius);

  switch (classification) {
    case 'Extreme Danger':
      return {
        topColor: '#B23A48',
        bottomColor: '#E53232',
        sunColor: '#FFEDD5',
        lawnColor: '#B79458', // parched, dry grass
        hazeIntensity: 1.0,
      };
    case 'Danger':
      return {
        topColor: '#D9603B',
        bottomColor: '#E8590C',
        sunColor: '#FFF3C4',
        lawnColor: '#A6A050',
        hazeIntensity: 0.8,
      };
    case 'Extreme Caution':
      return {
        topColor: '#E8A94B',
        bottomColor: '#FDB827',
        sunColor: '#FFF7DB',
        lawnColor: '#8FB35A',
        hazeIntensity: 0.55,
      };
    case 'Caution':
      return {
        topColor: '#EBCB6A',
        bottomColor: '#F5E050',
        sunColor: '#FFFDE7',
        lawnColor: '#79B863',
        hazeIntensity: 0.3,
      };
    default: // Safe
      return {
        topColor: '#3F7FA6',
        bottomColor: '#5DADE2',
        sunColor: '#FFFFFF',
        lawnColor: '#5FA65B', // lush green
        hazeIntensity: 0.1,
      };
  }
};
