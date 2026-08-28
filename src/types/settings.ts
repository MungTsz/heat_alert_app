// Matches the classification strings returned by getHeatIndexInfo exactly —
// keep these in sync if heatIndexUtils.ts classification labels ever change.
export type HeatLevel =
  | 'Neutral'
  | 'Very Warm'
  | 'Hot'
  | 'Very Hot'
  | 'Extremely Hot';

export const HEAT_LEVELS_ORDERED: HeatLevel[] = [
  'Neutral',
  'Very Warm',
  'Hot',
  'Very Hot',
  'Extremely Hot',
];

export type AqhiLevel = 'Low' | 'Moderate' | 'High' | 'Very High' | 'Serious';

export type NotificationSettings = {
  alertLevels: Record<HeatLevel, boolean>;
  aqhiAlertLevels: Record<AqhiLevel, boolean>; // NEW
  notifyCurrentLocation: boolean;
  notifyBookmarkedLocations: boolean;
};

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  alertLevels: {
    Neutral: false,
    'Very Warm': false,
    Hot: true,
    'Very Hot': true,
    'Extremely Hot': true,
  },
  aqhiAlertLevels: {
    Low: false,
    Moderate: false,
    High: true,
    'Very High': true,
    Serious: true,
  },
  notifyCurrentLocation: true,
  notifyBookmarkedLocations: true,
};
