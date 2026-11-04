// How the app explains heat index vs. air temperature to the public. The map
// and headline numbers stay heat-index-only; air temperature and humidity
// appear only as context at a single place (home card, map pin, chart),
// where the gap between the two numbers is what teaches "heat index ≠
// temperature".
export const HEAT_DISPLAY_CONFIG = {
  // Smallest gap (°C, between the rounded numbers actually shown) worth
  // calling out. Below it the two read as the same, and a "feels 0° hotter"
  // line would just be noise — common outside summer, when heat index ≈ air
  // temperature.
  feelsLikeGapMinC: 1,
};
