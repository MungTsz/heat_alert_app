// src/utils/sceneColors.ts
// Colour arithmetic for the cartoon scene: the haze fades the far hills and
// towers towards the smog colour, heat warms the low sky and dries the lawn,
// and night darkens everything — all by mixing palette colours rather than
// listing every combination.

const parseHex = (hex: string): [number, number, number] => {
  const h = hex.replace('#', '');
  return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)) as [number, number, number];
};

const toHex = (n: number): string =>
  Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, '0');

// `a` at t = 0, `b` at t = 1. Both must be #RRGGBB.
export const mixHex = (a: string, b: string, t: number): string => {
  const k = Math.max(0, Math.min(1, t));
  const [ar, ag, ab] = parseHex(a);
  const [br, bg, bb] = parseHex(b);
  return `#${toHex(ar + (br - ar) * k)}${toHex(ag + (bg - ag) * k)}${toHex(ab + (bb - ab) * k)}`;
};

export const withAlpha = (hex: string, alpha: number): string => {
  const [r, g, b] = parseHex(hex);
  return `rgba(${r},${g},${b},${Math.max(0, Math.min(1, alpha))})`;
};
