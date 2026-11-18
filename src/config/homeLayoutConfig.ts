// src/config/homeLayoutConfig.ts
// Home's first screen: the scene (with its side bar), the Environmental
// Index card and the top of the map should be visible on an ordinary day
// without scrolling. These sizes are a first pass — check them on a small
// and a large phone and tune here.
export const HOME_LAYOUT_CONFIG = {
  // Side padding of Home's scroll content. The side bar's tab sits in this
  // padding, flush with the screen edge.
  screenPadding: 20,
  // Cards start at least this far below the scene's character.
  minGapBelowCharacter: 24,
  // Width of the scrolling place name in the header.
  locationBoxWidth: 160,
  // Height of the map preview.
  mapPreviewHeight: 260,
};

// The Environmental Index card (EnviCard) and the level square it shares
// with the detail sheet's header (EnviLevelSquare).
export const ENVI_CARD_CONFIG = {
  paddingVertical: 14,
  paddingHorizontal: 14,
  // Space between the card's rows (header, band, chips, tiles, bottom bar).
  rowGap: 12,
  // The level square: the largest, strongest element on Home.
  squareSize: 64,
  squareRadius: 14,
  squareNumberFontSize: 40,
  squareOutlineWidth: 1,
  // "Environmental Index" label and its icon, beside the square.
  labelFontSize: 12,
  labelIconSize: 13,
  levelNameFontSize: 22,
  // Warning chips.
  chipFontSize: 12,
  chipIconSize: 13,
  chipRadius: 10,
  // Action tiles: icon with 1-2 words underneath.
  tileIconSize: 22,
  tileFontSize: 12,
  tileRadius: 12,
  tilePaddingVertical: 10,
  // "Full advice and forecast" bottom bar.
  moreFontSize: 13,
  moreIconSize: 16,
};

// The side bar of mini blocks on the scene's right edge (HomeInfoBar).
export const HOME_INFO_BAR_CONFIG = {
  // Closed until the user opens it; their choice is kept after that.
  defaultExpanded: false,
  // Pull tab with the chevron. Its touch area is widened with hitSlop to at
  // least minTouchSize in both directions.
  tabWidth: 22,
  tabHeight: 56,
  tabIconSize: 18,
  minTouchSize: 44,
  // Gap between the blocks and the tab.
  tabGap: 6,
  // One block.
  blockWidth: 92,
  blockHeight: 50,
  blockGap: 6,
  stripeWidth: 4,
  blockIconSize: 12,
  blockLabelFontSize: 11,
  blockValueFontSize: 18,
  // Open / close animation.
  animationMs: 220,
  // There is no separate "small phone" breakpoint: the blocks switch from
  // one column to a 2 × 2 grid whenever the scene area is shorter than the
  // column (four blockHeights plus three blockGaps), so the two can never
  // disagree.
};
