import type { GoogleMapType, MapLayer } from '../types/mapSettings';

// The base map styles, offered only in App settings (one stored value, via
// the shared useMapSettings) — never on the map itself, so the map's own
// picker is only about which data layer is shown.
export const MAP_TYPE_OPTIONS: readonly { key: GoogleMapType; label: string }[] = [
  { key: 'standard', label: 'Default' },
  { key: 'hybrid', label: 'Satellite' },
];

// Map layer behavior shared by every layer (Environmental Index, heat
// index, AQHI). One set of values on purpose: the layers must look and
// behave the same — same forecast length, same playback speed, same
// starting opacity — so switching layers only changes the data, never the
// experience.
export const MAP_LAYER_CONFIG = {
  // Hours of forecast frames after "now" in the map animation.
  forecastHours: 6,
  frameIntervalMs: 700,
  // Starting value of the layer-opacity slider.
  defaultOpacity: 0.55,
};

// Where the Environmental Index layer's picture comes from. 'aqhi-demo'
// borrows the AQHI tile for demos until a real index tile exists; switch
// to 'tile' then — no component changes needed.
export type EnviMapSource = 'aqhi-demo' | 'tile';
export const ENVI_MAP_SOURCE: EnviMapSource = 'aqhi-demo';

// Layer picker order: the index first, the two hazards under "View details".
export const MAP_LAYER_ORDER = {
  primary: 'envi' as MapLayer,
  details: ['heat', 'aqhi'] as readonly MapLayer[],
};

// Which layer a map opens on (useDefaultMapLayer): always the
// Environmental Index, as Home's card leads with it — the hazards are
// details the user opens when they want them. Every map returns to it each
// time it is opened.
//
// The season / PRAISE values stay here because leadHazard (utils/enviUtils)
// still uses them for the card's keywords and summary and for which tab the
// forecast sheet opens on:
// 1. the hazard with the higher level right now;
// 2. on a tie (same level, or no reading at all), the season's usual concern;
// 3. heat whenever AQHI has no data (PRAISE not configured) — checked first
//    by the forecast sheet, since it overrides the other two.
export const DEFAULT_MAP_LAYER_CONFIG = {
  startLayer: 'envi' as MapLayer,
  // Hong Kong calendar months (1-12) that break a tie towards AQHI: winter
  // and spring, when regional haze peaks. The rest (June-November, the hot
  // season) break it towards heat index.
  aqhiSeasonMonths: [12, 1, 2, 3, 4, 5] as readonly number[],
  seasonFallbackLayer: 'heat' as const,
  // Without PRAISE there is no AQHI forecast to open on.
  noPraiseLayer: 'heat' as const,
};

// The Environmental Index map legend (EnviMapLegend). The vertical style
// matches HeatLegend / AqhiLegend; the compact one is a single row for the
// small Home preview, which has no room for a column of names.
export const ENVI_MAP_LEGEND_CONFIG = {
  swatchWidth: 14,
  swatchHeight: 8,
  swatchRadius: 1.5,
  fontSize: 8,
  // Compact row: gap between one level's swatch+number and the next.
  compactItemGap: 6,
  // Distance of the compact legend from the preview's bottom-left corner.
  compactInset: 8,
};

// The layer picker's round button: on small maps / on the full-screen map.
// MapScreen also spaces the legend and return chip below it.
export const MAP_LAYER_PICKER_CONFIG = {
  buttonSize: 38,
  buttonSizeLarge: 54,
};

// The "Heat index · ← Environmental Index" chip shown while a detail layer
// is up. It sits in its own row under the top controls, centred and clear
// of the back button (left) and legend (right).
export const MAP_LAYER_RETURN_CHIP_CONFIG = {
  // Smallest touch area in both directions (accessibility minimum).
  minTouchSize: 44,
  paddingHorizontal: 14,
  fontSize: 13,
  // Space kept free on each side, so the chip never covers the legend.
  sideInset: 64,
  // Gap between the top controls' row and the chip.
  gapBelowTopBar: 8,
};

// The card under the map for a tapped point on the Environmental Index
// layer (MapPointCard). It lives outside MapView: Android draws a custom
// Marker as one bitmap, so a button inside a pin can't be tapped.
export const MAP_POINT_CARD_CONFIG = {
  padding: 10,
  radius: 14,
  // Its level square — smaller than Home's, larger than a pin's.
  squareSize: 40,
  squareRadius: 10,
  squareNumberFontSize: 24,
  titleFontSize: 11,
  levelNameFontSize: 16,
  detailsFontSize: 13,
  detailsIconSize: 16,
  minTouchSize: 44,
  blockGap: 6,
  // Space between the card and the controls under it.
  gapAboveControls: 12,
};

// Saved places drawn on the map (Home's preview and full-screen map): a
// white badge holding the place's category icon, in the category's own
// colour (PLACE_CATEGORY_CONFIG / EXPOSURE_IO_CONFIG) — the same icon and
// colour the place has in Places and on the Exposure map, and nothing like
// the tapped point's blue pin, so "my places" and "the spot I'm looking at"
// never read as the same thing.
export const MAP_PLACE_PIN_CONFIG = {
  badgeSize: 30,
  iconSize: 16,
  borderWidth: 2,
  // The small copy of the icon in front of the place's name.
  titleIconSize: 12,
};

// The small level square a pin shows on the Environmental Index layer.
export const MAP_PIN_ENVI_SQUARE_CONFIG = {
  squareSize: 22,
  squareRadius: 6,
  squareNumberFontSize: 13,
};

// The tapped point's pin.
export const MAP_POINT_PIN_CONFIG = {
  iconSize: 42,
  color: '#2B7A9E',
};
