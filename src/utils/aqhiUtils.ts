// src/utils/aqhiUtils.ts
export interface AqhiInfo {
  classification: string;
  color: string;
}

// Per-value color, matching the official HK AQHI legend exactly rather than
// a banded approximation — each integer 1-10 (and 11 for "10+") has its own shade,
// brightening toward the top of each band as it approaches the next classification.
export const AQHI_COLOR_BY_VALUE: Record<number, string> = {
  1: '#3E9C35',
  2: '#6DBB3C',
  3: '#9ED14E',
  4: '#F2E500',
  5: '#F7C400',
  6: '#F79420',
  7: '#E8242A',
  8: '#B0452F',
  9: '#8D4A3C',
  10: '#4A2E2A',
  11: '#000000', // "10+"
};

const AQHI_CLASSIFICATION_BY_VALUE: Record<number, string> = {
  1: 'Low',
  2: 'Low',
  3: 'Low',
  4: 'Moderate',
  5: 'Moderate',
  6: 'Moderate',
  7: 'High',
  8: 'Very High',
  9: 'Very High',
  10: 'Very High',
  11: 'Serious',
};

const clampAqhiValue = (aqhi: number): number => {
  const rounded = Math.round(aqhi);
  return Math.max(1, Math.min(11, rounded));
};

export const getAqhiInfo = (aqhi: number): AqhiInfo => {
  const v = clampAqhiValue(aqhi);
  return {
    classification: AQHI_CLASSIFICATION_BY_VALUE[v],
    color: AQHI_COLOR_BY_VALUE[v],
  };
};

export const getAqhiTextColor = (aqhi: number): string => {
  const v = clampAqhiValue(aqhi);
  // Darkened variants for text-on-light-background legibility, keeping the
  // same hue family as the official color per value.
  const textColors: Record<number, string> = {
    1: '#255E20',
    2: '#2E7D1F',
    3: '#3F8F2A',
    4: '#9C9200',
    5: '#A67D0A',
    6: '#B36A15',
    7: '#A81A1F',
    8: '#7A3F30',
    9: '#5F3329',
    10: '#2E1C1A',
    11: '#000000',
  };
  return textColors[v];
};

export const valueToAqhiColor = (aqhi: number, alpha: number = 0.9): string => {
  const { color } = getAqhiInfo(aqhi);
  const r = parseInt(color.slice(1, 3), 16);
  const g = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

// "10+" display label, matching the legend's own notation for the top value
export const formatAqhiValue = (aqhi: number): string => {
  const v = clampAqhiValue(aqhi);
  return v >= 11 ? '10+' : v.toString();
};
