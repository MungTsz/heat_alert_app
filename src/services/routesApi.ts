import { ROUTES_API_CONFIG } from '../config/routesApiConfig';

const ROUTES_API_URL = 'https://routes.googleapis.com/directions/v2:computeRoutes';

// Minimal field mask — Routes API bills partly by which fields are
// requested, so only ask for the polyline + total distance (the latter is
// needed for the detour-ratio fallback check, not for display).
const FIELD_MASK = 'routes.distanceMeters,routes.polyline.encodedPolyline';

export type LatLon = { lat: number; lon: number };

export type WalkingRoute = { encodedPolyline: string; distanceMeters: number };

// react-native's fetch has no request timeout of its own, same reasoning as
// exposureApi.ts's fetchWithTimeout — this is a much shorter timeout since
// it's a lightweight two-point directions call, not a batch ingest.
const fetchWithTimeout = async (
  input: string,
  init: RequestInit,
): Promise<Response> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ROUTES_API_CONFIG.timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
};

// Fetches a walking route between two points. Returns null (doesn't throw)
// when Routes API reports no route — that's an expected outcome (e.g. no
// mapped path between the two points), not an exceptional one; callers treat
// it the same as a caught network/timeout error and fall back to a straight
// line. routingPreference is deliberately omitted: it's only valid for
// DRIVE/TWO_WHEELER and Routes API 400s if set alongside WALK.
export const fetchWalkingRoute = async (
  origin: LatLon,
  destination: LatLon,
): Promise<WalkingRoute | null> => {
  try {
    const response = await fetchWithTimeout(ROUTES_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': ROUTES_API_CONFIG.apiKey,
        'X-Goog-FieldMask': FIELD_MASK,
      },
      body: JSON.stringify({
        origin: { location: { latLng: { latitude: origin.lat, longitude: origin.lon } } },
        destination: {
          location: { latLng: { latitude: destination.lat, longitude: destination.lon } },
        },
        travelMode: 'WALK',
        polylineQuality: 'OVERVIEW',
      }),
    });

    if (!response.ok) {
      console.log('Routes API request failed:', response.status);
      return null;
    }

    const data = await response.json();
    const route = data.routes?.[0];
    if (!route?.polyline?.encodedPolyline) return null;

    return {
      encodedPolyline: route.polyline.encodedPolyline,
      distanceMeters: route.distanceMeters ?? 0,
    };
  } catch (error) {
    console.log('Routes API request errored:', error);
    return null;
  }
};
