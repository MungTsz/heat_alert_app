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
// with the recommendations sheet's header (EnviLevelSquare).
export const ENVI_CARD_CONFIG = {
  paddingVertical: 14,
  paddingHorizontal: 14,
  // Space between the card's rows (index block, summary, tiles, bottom bar).
  rowGap: 12,
  // The level square: the largest, strongest element on Home.
  squareSize: 64,
  squareRadius: 14,
  squareNumberFontSize: 40,
  squareOutlineWidth: 1,
  // "Environmental Index" title and its leaf icon, beside the square.
  labelFontSize: 16,
  labelIconSize: 16,
  levelNameFontSize: 22,
  // The plain-language line ("Air quality is good, but it's very hot.").
  summaryFontSize: 14,
  // Action tiles: icon with a few words underneath.
  tileIconSize: 22,
  tileFontSize: 12,
  tileRadius: 12,
  tilePaddingVertical: 10,
  // "Detailed recommendations" bottom bar, and the index block's chevron.
  moreFontSize: 13,
  moreIconSize: 16,
};

// The side bar of mini blocks on the scene's right edge (HomeInfoBar).
// It sits over the scene without moving the character, so the blocks are
// kept narrow; when the column is taller than the scene area it scrolls.
export const HOME_INFO_BAR_CONFIG = {
  // Closed until the user opens it; their choice is kept after that.
  defaultExpanded: false,
  // Pull tab with the chevron. Its touch area is widened with hitSlop to at
  // least minTouchSize in both directions.
  tabWidth: 20,
  tabHeight: 52,
  tabIconSize: 16,
  minTouchSize: 44,
  // Gap between the blocks and the tab.
  tabGap: 4,
  // One block.
  blockWidth: 82,
  blockHeight: 42,
  blockGap: 5,
  stripeWidth: 3,
  blockIconSize: 11,
  blockLabelFontSize: 10,
  blockValueFontSize: 15,
  // Open / close animation.
  animationMs: 220,
  // Swiping on the scene: a horizontal drag at least this long opens (left)
  // or closes (right) the bar. Drags that are mostly vertical are left to
  // the page's scroll.
  swipeMinDistance: 30,
};
