// src/utils/aqhiUtils.ts
export interface AqhiInfo {
  classification: string;
  color: string;
}

// Real HK AQHI bands: 1-3 Low, 4-6 Moderate, 7 High, 8-10 Very High, 10+ Serious
export const getAqhiInfo = (aqhi: number): AqhiInfo => {
  if (aqhi >= 11) return { classification: 'Serious', color: '#7B1E3D' };
  if (aqhi >= 8) return { classification: 'Very High', color: '#D9534F' };
  if (aqhi >= 7) return { classification: 'High', color: '#E99066' };
  if (aqhi >= 4) return { classification: 'Moderate', color: '#F4D97A' };
  return { classification: 'Low', color: '#87C693' };
};

// Matches getAqhiInfo's bands, but returns an rgba() string with adjustable
// alpha — needed for the overlay renderer, which shares this shape with heat's.
export const valueToAqhiColor = (aqhi: number, alpha: number = 0.9): string => {
  const { color } = getAqhiInfo(aqhi);
  const r = parseInt(color.slice(1, 3), 16);
  const g = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

export const getAqhiTextColor = (aqhi: number): string => {
  if (aqhi >= 11) return '#7B1E3D';
  if (aqhi >= 8) return '#B23A2E';
  if (aqhi >= 7) return '#C56A2E';
  if (aqhi >= 4) return '#9A7A0F'; // darkened from the pastel yellow for contrast
  return '#3E7A47';
};
