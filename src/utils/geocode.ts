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
