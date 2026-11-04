// Map hazard-layer behavior shared by every layer (heat index, AQHI). One
// set of values on purpose: the layers must look and behave the same —
// same forecast length, same playback speed, same starting opacity — so
// switching layers only changes the data, never the experience.
export const MAP_LAYER_CONFIG = {
  // Hours of forecast frames after "now" in the map animation.
  forecastHours: 6,
  frameIntervalMs: 700,
  // Starting value of the layer-opacity slider.
  defaultOpacity: 0.55,
};
