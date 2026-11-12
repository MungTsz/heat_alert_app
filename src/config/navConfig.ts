// src/config/navConfig.ts
import { Bell, Flame, Footprints, LucideIcon, MapPin } from 'lucide-react-native';

// Each tab answers one part of the app's single question, "how dangerous
// are heat and air for me and the people I care about?" — named for the
// user's question, never for the system behind it (Places, not Community;
// Alerts, not Settings).
export type TabName = 'Environment' | 'Places' | 'Exposure' | 'Alerts';

export type NavTab = {
  key: TabName;
  label: string;
  icon: LucideIcon;
  // Solid shapes (flame, pin, bell) read better filled when active; line
  // icons like footprints turn into a blob, so they stay outlined.
  fillWhenActive: boolean;
};

// Bar order: Places sits next to Environment because it is the alert watch
// list and gets opened more often than Exposure.
export const NAV_TABS: readonly NavTab[] = [
  { key: 'Environment', label: 'Environment', icon: Flame, fillWhenActive: true },
  { key: 'Places', label: 'Places', icon: MapPin, fillWhenActive: false },
  { key: 'Exposure', label: 'Exposure', icon: Footprints, fillWhenActive: false },
  { key: 'Alerts', label: 'Alerts', icon: Bell, fillWhenActive: true },
];

// The tab the app opens on, and where Android's back button returns to
// before it is allowed to leave the app.
export const DEFAULT_TAB: TabName = 'Environment';

export const NAV_BAR_CONFIG = {
  iconSize: 22,
  activeColor: '#000000',
  inactiveColor: '#8E8E93',
  bubbleWidth: 72,
  bubbleHeight: 52,
  // The "something needs you here" dot on a tab icon (Alerts, while an
  // alert is active) — the app's alert red, same as the alert badges.
  dotColor: '#D9534F',
  dotSize: 8,
};
