// src/config/homeLayoutConfig.ts
// Home's first screen: the scene, the ENVI card, both hazard cards and the
// top of the map should be visible on an ordinary day without scrolling.
// These sizes are a first pass — check them on a small and a large phone
// and tune here.
export const HOME_LAYOUT_CONFIG = {
  // Vertical padding of the ENVI card, Home's headline.
  enviCardPaddingVertical: 12,
  // Vertical padding of the Heat index / AQHI cards at full size.
  hazardCardPaddingVertical: 12,
  // The same cards in their `compact` form, as Home shows them under the
  // ENVI card: supporting detail now, so they give their height to it.
  hazardCardCompactPaddingVertical: 8,
  // Height of the map preview (was 300 before the ENVI card took its share
  // of the first screen).
  mapPreviewHeight: 260,
  // The advice sentence on the ENVI card. It comes from the alert copy
  // (an alert's own advice, or the level's suggestion), and tests hold
  // every variant under this length so it stays a short line rather than a
  // paragraph.
  adviceMaxChars: 120,
};
