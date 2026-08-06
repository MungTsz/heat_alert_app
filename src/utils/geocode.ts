export type GeocodeResult = {
  latitude: number;
  longitude: number;
  displayName: string;
};

export const geocodeAddress = async (
  address: string,
): Promise<GeocodeResult | null> => {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(
        address,
      )}&limit=1`,
      { headers: { 'User-Agent': 'HeatAlertApp/1.0' } },
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
      `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(
        query,
      )}&limit=5`,
      { headers: { 'User-Agent': 'HeatAlertApp/1.0' } },
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
