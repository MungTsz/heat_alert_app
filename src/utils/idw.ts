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
  fallback: number = 1,
): number => {
  if (knownPoints.length === 0) return fallback;

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
