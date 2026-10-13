import { PLACE_LOOKUP_CONFIG } from '../config/placeLookupConfig';
import { ReverseGeocodeResult } from '../types/placeLookup';
import { fetchWithTimeout } from './fetchWithTimeout';

export type GeocodeResult = {
  latitude: number;
  longitude: number;
  displayName: string;
};

const NOMINATIM_HEADERS = { 'User-Agent': PLACE_LOOKUP_CONFIG.userAgent };

export const geocodeAddress = async (
  address: string,
): Promise<GeocodeResult | null> => {
  try {
    const response = await fetch(
      `${PLACE_LOOKUP_CONFIG.nominatimBaseUrl}/search?format=jsonv2&q=${encodeURIComponent(
        address,
      )}&limit=1`,
      { headers: NOMINATIM_HEADERS },
    );
    const data = await response.json();

    if (Array.isArray(data) && data.length > 0) {
      const result = data[0];
      return {
        latitude: parseFloat(result.lat),
        longitude: parseFloat(result.lon),
        displayName: result.display_name,
      };
    }
    return null;
  } catch (error) {
    console.log('Geocode error:', error);
    return null;
  }
};

// Returns multiple candidate matches for live "as-you-type" suggestions
export const searchAddressSuggestions = async (
  query: string,
): Promise<GeocodeResult[]> => {
  if (query.trim().length < 3) return []; // avoid firing on very short/incomplete input

  try {
    const response = await fetch(
      `${PLACE_LOOKUP_CONFIG.nominatimBaseUrl}/search?format=jsonv2&q=${encodeURIComponent(
        query,
      )}&limit=5`,
      { headers: NOMINATIM_HEADERS },
    );
    const data = await response.json();

    if (!Array.isArray(data)) return [];

    return data.map((result: any) => ({
      latitude: parseFloat(result.lat),
      longitude: parseFloat(result.lon),
      displayName: result.display_name,
    }));
  } catch (error) {
    console.log('Address suggestion error:', error);
    return [];
  }
};

type ReverseGeocodeOptions = {
  // Nominatim detail level (18 = building). Omitted → Nominatim's default.
  zoom?: number;
  // Response language. Omitted → Nominatim's default (local names).
  language?: string;
  // Also return the matched object's names in every language/short form.
  nameDetails?: boolean;
  timeoutMs?: number;
};

// Shared by useLocation (area name for the home header) and place naming
// (placeLookupService) — options are opt-in so the header's existing request
// stays unchanged. Returns null on any failure; callers fall back.
export const reverseGeocode = async (
  latitude: number,
  longitude: number,
  options: ReverseGeocodeOptions = {},
): Promise<ReverseGeocodeResult | null> => {
  const params = [`format=jsonv2`, `lat=${latitude}`, `lon=${longitude}`];
  if (options.zoom !== undefined) params.push(`zoom=${options.zoom}`);
  if (options.language) params.push(`accept-language=${options.language}`);
  if (options.nameDetails) params.push('namedetails=1');

  try {
    const response = await fetchWithTimeout(
      `${PLACE_LOOKUP_CONFIG.nominatimBaseUrl}/reverse?${params.join('&')}`,
      { headers: NOMINATIM_HEADERS },
      options.timeoutMs ?? PLACE_LOOKUP_CONFIG.nominatimTimeoutMs,
    );
    const data = await response.json();
    if (!data?.address) return null;
    return {
      displayName: data.display_name,
      category: data.category,
      type: data.type,
      name: data.name || undefined,
      namedetails: data.namedetails ?? undefined,
      address: data.address,
    };
  } catch (error) {
    console.log('Reverse geocode error:', error);
    return null;
  }
};
