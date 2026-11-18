// src/config/enviConfig.ts

// ENVI: this app's one overall level for heat and air quality together.
// Heat index and AQHI each have five levels of their own; ENVI is the higher
// of the two (see utils/enviUtils.ts). Index 0 is level 1.
//
// The colours are the AQHI forecast chart's five flat bands, which reads
// this table too, so the palette is defined once. `textColor` keeps the
// level number readable on the yellow and the black cells.
export const ENVI_LEVELS = [
  { level: 1, name: 'Low', color: '#4CAF33', textColor: '#FFFFFF' },
  { level: 2, name: 'Moderate', color: '#F2C300', textColor: '#222222' },
  { level: 3, name: 'High', color: '#E8242A', textColor: '#FFFFFF' },
  { level: 4, name: 'Very High', color: '#8D4A3C', textColor: '#FFFFFF' },
  { level: 5, name: 'Serious', color: '#000000', textColor: '#FFFFFF' },
] as const;

export const ENVI_CONFIG = {
  // Both hazards at or above this level → combined advice (DUAL_ADVICE).
  dualAdviceMinLevel: 3,
  // Level 1 shows no message.
  adviceMinLevel: 2,
};

// The five-cell band on Home's ENVI card (EnviBand).
export const ENVI_BAND_CONFIG = {
  cellHeight: 26,
  cellGap: 3,
  cellRadius: 6,
  // Cells other than the current level — and every cell while there is no
  // reading — so the current one stands out without the rest disappearing.
  inactiveOpacity: 0.35,
  // Half-width of the pointer triangle above the current cell.
  pointerSize: 6,
};
