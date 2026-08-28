// src/data/aqhi/apiAqhiProvider.ts
import { AqhiDataProvider, AqhiPoint, Coordinates } from './types';
import { fetchPraisePointData, toHkTimestamp } from '../../services/praiseApi';

// PRAISE-HK's get_data returns ONE point for the exact lat/lng queried — to
// give the map's IDW overlay multiple anchor points (needed for interpolation
// across an area), we query a small ring of nearby coordinates around the
// center, similar in spirit to your original mock station template.
const SAMPLE_OFFSETS = [
  { lat: 0, lng: 0 },
  { lat: 0.03, lng: 0.03 },
  { lat: 0.03, lng: -0.03 },
  { lat: -0.03, lng: 0.03 },
  { lat: -0.03, lng: -0.03 },
  { lat: 0.06, lng: 0 },
  { lat: -0.06, lng: 0 },
];

export const apiAqhiProvider: AqhiDataProvider = {
  getAqhiPoints: async (center: Coordinates): Promise<AqhiPoint[]> => {
    const ts = toHkTimestamp();

    const results = await Promise.all(
      SAMPLE_OFFSETS.map(async (offset, i) => {
        const lat = center.latitude + offset.lat;
        const lng = center.longitude + offset.lng;
        try {
          const data = await fetchPraisePointData(lat, lng, ts, ts, [
            'AQHIBN2024',
          ]);
          const value = data.AQHIBN2024?.[0];
          if (typeof value !== 'number') return null;
          return {
            id: `praise-${i}`,
            latitude: lat,
            longitude: lng,
            aqhi: value,
          };
        } catch (error) {
          console.log('PRAISE point fetch failed for offset', offset, error);
          return null;
        }
      }),
    );

    return results.filter((p): p is AqhiPoint => p !== null);
  },
};
