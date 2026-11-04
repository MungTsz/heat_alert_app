// src/config/alertUiConfig.ts
// Presentation constants for the alert settings UI (Settings "About you",
// the Community alert sheet and the Add place audience step).
export const ALERT_UI = {
  // The app's existing red accent (Settings switches, + button).
  accentColor: '#D9534F',
  mutedTextColor: '#888',
  trackColor: '#F0F0F0',
  // The audience editor scrolls inside bottom sheets past this share of the
  // screen height, so Save stays on screen on small phones.
  sheetScrollMaxHeightRatio: 0.62,
  // Alert badges on Home / Community cards: "now" in the accent red, a
  // heads-up in amber so the two never read the same.
  badgeNowColor: '#D9534F',
  badgeHeadsUpColor: '#C77C02',
  // The detail sheet's scroll area, as a share of the screen height — below
  // ForecastSheet's own 75% cap, leaving room for its title row.
  detailScrollMaxHeightRatio: 0.62,
};

// Step numbers of the Add place flow — one place to change when a step is
// added, so every step's "Step N of M" stays right.
export const ADD_PLACE_STEPS = {
  category: 1,
  audience: 2,
  location: 3,
  total: 3,
};
