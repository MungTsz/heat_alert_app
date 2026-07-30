export type WeightedPoint = {
  latitude: number;
  longitude: number;
  value: number;
};

const distance = (
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number,
): number => {
  const dLat = aLat - bLat;
  const dLng = aLng - bLng;
  return Math.sqrt(dLat * dLat + dLng * dLng);
};

export const idwInterpolate = (
  targetLat: number,
  targetLng: number,
  knownPoints: WeightedPoint[],
  power: number = 2,
): number => {
  if (knownPoints.length === 0) return 25;

  let weightedSum = 0;
  let weightTotal = 0;

  for (const point of knownPoints) {
    const d = distance(targetLat, targetLng, point.latitude, point.longitude);
    if (d < 0.0001) return point.value;
    const weight = 1 / Math.pow(d, power);
    weightedSum += weight * point.value;
    weightTotal += weight;
  }

  return weightTotal > 0 ? weightedSum / weightTotal : 25;
};

const lerpColor = (
  v: number,
  lo: number,
  hi: number,
  cLo: [number, number, number],
  cHi: [number, number, number],
  alpha: number,
): string => {
  const t = Math.max(0, Math.min(1, (v - lo) / (hi - lo)));
  const r = Math.round(cLo[0] + (cHi[0] - cLo[0]) * t);
  const g = Math.round(cLo[1] + (cHi[1] - cLo[1]) * t);
  const b = Math.round(cLo[2] + (cHi[2] - cLo[2]) * t);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

// Heat Index scale (Celsius), NOT AQHI — Safe / Caution / Extreme Caution / Danger / Extreme Danger
export const valueToColor = (temp: number, alpha: number = 0.35): string => {
  if (temp <= 27)
    return lerpColor(temp, 20, 27, [0, 128, 60], [130, 200, 60], alpha); // Safe (green)
  if (temp <= 32)
    return lerpColor(temp, 27, 32, [130, 200, 60], [255, 220, 0], alpha); // Caution (yellow)
  if (temp <= 39)
    return lerpColor(temp, 32, 39, [255, 220, 0], [255, 140, 0], alpha); // Extreme Caution (orange)
  if (temp <= 46)
    return lerpColor(temp, 39, 46, [255, 140, 0], [220, 20, 20], alpha); // Danger (red)
  return `rgba(180, 0, 130, ${alpha})`; // Extreme Danger (magenta)
};

// Same breakpoints, used for the solid pin color (alpha=1)
export const valueToPinColor = (temp: number): string => valueToColor(temp, 1);
