// src/config/enviConfig.ts

// The Environmental Index (code name ENVI; users only see "Environmental
// Index"): this app's one overall level for heat and air quality together.
// Heat index and AQHI each have five levels of their own; the index is the
// higher of the two (see utils/enviUtils.ts). Index 0 is level 1.
//
// The colours are the AQHI forecast chart's five flat bands, which reads
// this table too, so the palette is defined once. They appear only where
// the overall level is shown (the level square, the band); heat index and
// AQHI values keep their own NWS / EPD colours everywhere.
//
// `textColor` is the number on the square and the band. Level 1 uses dark
// text: white on this green is only 2.8:1, under the 3:1 that even large
// bold text needs (enviKeywords.test.ts checks every level).
// `outlined` adds a thin light edge so the black level 5 square still has a
// shape on Home's dark glass card.
export const ENVI_LEVELS = [
  { level: 1, name: 'Low', color: '#4CAF33', textColor: '#1A1A1A', outlined: false },
  { level: 2, name: 'Moderate', color: '#F2C300', textColor: '#1A1A1A', outlined: false },
  { level: 3, name: 'High', color: '#E8242A', textColor: '#FFFFFF', outlined: false },
  { level: 4, name: 'Very High', color: '#8D4A3C', textColor: '#FFFFFF', outlined: false },
  { level: 5, name: 'Serious', color: '#000000', textColor: '#FFFFFF', outlined: true },
] as const;

export const ENVI_CONFIG = {
  // Both hazards at or above this level → both warning chips and the fixed
  // combined action tiles (ENVI_DUAL_ACTIONS).
  dualAdviceMinLevel: 3,
  // Smallest contrast allowed between a level's number and its colour —
  // WCAG's minimum for large bold text, which the square's number is.
  minNumberContrast: 3,
};

// Colours that depend on what the square and band sit on: Home's dark glass
// card, or the white detail sheet. Level colours never change; only the
// arrows, their labels and the "--" state do.
export const ENVI_TONES = {
  glass: {
    marker: '#FFFFFF',
    mutedText: 'rgba(255,255,255,0.75)',
    emptyFill: 'rgba(255,255,255,0.14)',
    emptyText: '#FFFFFF',
    outline: 'rgba(255,255,255,0.6)',
  },
  sheet: {
    marker: '#333333',
    mutedText: '#6B6B70',
    emptyFill: '#E5E5EA',
    emptyText: '#8E8E93',
    outline: 'rgba(0,0,0,0.15)',
  },
} as const;

export type EnviTone = keyof typeof ENVI_TONES;

// The five-cell band (EnviBand) and its "Now" / "Today's peak" arrows.
export const ENVI_BAND_CONFIG = {
  cellHeight: 22,
  cellGap: 3,
  cellRadius: 6,
  // Cells other than the current level — and every cell while there is no
  // reading — so the current one stands out without the rest disappearing.
  inactiveOpacity: 0.3,
  // Arrow triangle: full width and height.
  arrowWidth: 12,
  arrowHeight: 8,
  arrowStrokeWidth: 1.5,
  // Dash pattern of the hollow "Today's peak" arrow.
  peakArrowDash: '2,2',
  // Height of the label row above the arrows, and its font size.
  markerLabelHeight: 15,
  markerLabelFontSize: 11,
  // Room a marker label may take beyond its own cell (labels are wider
  // than a fifth of the card); edge and next-door rules keep it inside the
  // card and off the other label.
  markerLabelMaxWidth: 110,
};
