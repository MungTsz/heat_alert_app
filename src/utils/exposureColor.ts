// src/utils/exposureColor.ts

// Relative color scale (green -> red), normalized to the caller's own max
// exposure value. Exposure has no fixed classification scale like heat
// index/AQHI do, so a self-contained gradient is the right fit here rather
// than reusing those domains' band colors.
export const exposureColor = (value: number, max: number): string => {
  if (max <= 0) return 'rgba(130, 200, 60, 0.9)';
  const t = Math.max(0, Math.min(1, value / max));
  const r = Math.round(130 + (220 - 130) * t);
  const g = Math.round(200 - (200 - 20) * t);
  const b = Math.round(60 - (60 - 20) * t);
  return `rgba(${r}, ${g}, ${b}, 0.9)`;
};
