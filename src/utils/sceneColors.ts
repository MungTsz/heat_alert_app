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
    case 'Extremely Hot':
      return {
        topColor: '#B23A48',
        bottomColor: '#DF7C8D',
        sunColor: '#FFEDD5',
        lawnColor: '#B79458', // parched, dry grass
        hazeIntensity: 1.0,
      };
    case 'Very Hot':
      return {
        topColor: '#D9603B',
        bottomColor: '#E99066',
        sunColor: '#FFF3C4',
        lawnColor: '#A6A050',
        hazeIntensity: 0.8,
      };
    case 'Hot':
      return {
        topColor: '#E8A94B',
        bottomColor: '#F0B96D',
        sunColor: '#FFF7DB',
        lawnColor: '#8FB35A',
        hazeIntensity: 0.55,
      };
    case 'Very Warm':
      return {
        topColor: '#EBCB6A',
        bottomColor: '#F4D97A',
        sunColor: '#FFFDE7',
        lawnColor: '#79B863',
        hazeIntensity: 0.3,
      };
    default: // Neutral
      return {
        topColor: '#6FAF9C',
        bottomColor: '#87C693',
        sunColor: '#FFFFFF',
        lawnColor: '#5FA65B', // lush green
        hazeIntensity: 0.1,
      };
  }
};
