// src/utils/aqhiUtils.ts
import { AqhiPoint } from '../data/aqhi/types';
import { idwInterpolate } from './idw';

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

export const valueToAqhiColor = (aqhi: number, alpha: number = 0.9): string => {
  const { color } = getAqhiInfo(aqhi);
  const r = parseInt(color.slice(1, 3), 16);
  const g = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

// AQHI at an arbitrary point, IDW-estimated from the provider's samples and
// rounded to the whole number the UI shows. null when there are no samples
// yet (loading) or at all (fetch failed) — callers show "--" rather than
// idwInterpolate's numeric fallback, which would read as a real "1 Low".
export const estimateAqhiAt = (
  latitude: number,
  longitude: number,
  points: AqhiPoint[],
): number | null =>
  points.length === 0
    ? null
    : Math.round(
        idwInterpolate(
          latitude,
          longitude,
          points.map(p => ({
            latitude: p.latitude,
            longitude: p.longitude,
            value: p.aqhi,
          })),
        ),
      );

// "10+" display label, matching the legend's own notation for the top value
export const formatAqhiValue = (aqhi: number): string => {
  const v = clampAqhiValue(aqhi);
  return v >= 11 ? '10+' : v.toString();
};

// A level's value span ("1-3", "7", "8-10", "10+"), derived from the same
// value→classification table getAqhiInfo uses, so labels like "Very High
// (8-10)" can never disagree with how readings are classified.
export const formatAqhiLevelRange = (level: string): string => {
  const values = Object.entries(AQHI_CLASSIFICATION_BY_VALUE)
    .filter(([, classification]) => classification === level)
    .map(([value]) => Number(value));
  if (values.length === 0) return '';
  const min = Math.min(...values);
  const max = Math.max(...values);
  return min === max ? formatAqhiValue(min) : `${min}-${formatAqhiValue(max)}`;
};
