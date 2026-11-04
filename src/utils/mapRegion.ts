// src/utils/mapRegion.ts
import { Region } from 'react-native-maps';

// A react-native-maps Region (center + span) as the corner box that both
// PRAISE and the spatial temperature API take for map tiles.
export const regionToBounds = (region: Region) => {
  const halfLng = Math.abs(region.longitudeDelta) / 2;
  const halfLat = Math.abs(region.latitudeDelta) / 2;
  return {
    lng0: region.longitude - halfLng,
    lat0: region.latitude - halfLat,
    lng1: region.longitude + halfLng,
    lat1: region.latitude + halfLat,
  };
};
