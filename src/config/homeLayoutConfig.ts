// src/config/homeLayoutConfig.ts
// Home's first screen: the scene, both hazard cards and the map should all
// be visible on an ordinary day without scrolling. These sizes are a first
// pass — check them on a small and a large phone and tune here.
export const HOME_LAYOUT_CONFIG = {
  // Vertical padding of the Heat index / AQHI cards (was 18). The numbers
  // keep their size; only the space around them shrinks.
  hazardCardPaddingVertical: 12,
  // Height of the map preview (was 380).
  mapPreviewHeight: 300,
  // The advice line under Temp · Humidity on alert days. Advice comes from
  // the alert copy, and tests hold every variant under this length so it
  // stays a short footer rather than a paragraph.
  adviceMaxChars: 120,
};
