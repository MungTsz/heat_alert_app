// src/config/alertUiConfig.ts
// Presentation constants for the alert UI (the Alerts tab, Home's alert
// banner, the Places alert sheet and the Add place audience step).
export const ALERT_UI = {
  // The app's existing red accent (Alerts switches, + button).
  accentColor: '#D9534F',
  mutedTextColor: '#888',
  trackColor: '#F0F0F0',
  // Selected option cards and level chips: accent outline on a light tint.
  selectedTint: '#FDECEC',
  optionBorderColor: '#E4E4E4',
  optionRadius: 12,
  // The audience editor scrolls inside bottom sheets past this share of the
  // screen height, so Save stays on screen on small phones.
  sheetScrollMaxHeightRatio: 0.62,
  // Alert badges on Home / Places cards: "now" in the accent red, a
  // heads-up in amber so the two never read the same.
  badgeNowColor: '#D9534F',
  badgeHeadsUpColor: '#C77C02',
  // A live alert at an urgent level (URGENT_LEVELS) — darker than the
  // accent so Home's banner and the Alerts list set it apart from a
  // normal "Alert now".
  urgentColor: '#9B1C1C',
  // Most messages the Alerts tab's "Recent alerts" list shows; the log
  // itself keeps up to ALERT_MESSAGE_LOG_CONFIG.maxEntries.
  recentAlertsMax: 10,
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
