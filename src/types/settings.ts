// Matches the classification strings returned by getHeatIndexInfo exactly —
// keep these in sync if heatIndexUtils.ts classification labels ever change.
export type HeatLevel =
  | 'Safe'
  | 'Caution'
  | 'Extreme Caution'
  | 'Danger'
  | 'Extreme Danger';

export const HEAT_LEVELS_ORDERED: HeatLevel[] = [
  'Safe',
  'Caution',
  'Extreme Caution',
  'Danger',
  'Extreme Danger',
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
    Safe: false,
    Caution: false,
    'Extreme Caution': true,
    Danger: true,
    'Extreme Danger': true,
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
