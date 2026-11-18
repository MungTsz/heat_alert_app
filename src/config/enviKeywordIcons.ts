// src/config/enviKeywordIcons.ts
import {
  Activity,
  AirVent,
  Blinds,
  Car,
  Clock,
  Droplets,
  HeartPulse,
  House,
  LucideIcon,
  Sun,
  Timer,
  Trees,
  TriangleAlert,
} from 'lucide-react-native';
import { EnviActionId } from '../types/envi';

// The icon for each Environmental Index action keyword. Kept apart from
// enviKeywords.ts (like exposureIoIconConfig) so the pure keyword logic and
// its tests don't load icon components.
//
// One icon always means one thing, and the word is always shown under it.
// "Stay cool" and "Air-con on" share AirVent on purpose: both mean "get to
// air conditioning".
export const ENVI_ACTION_ICONS: Record<EnviActionId, LucideIcon> = {
  drinkWater: Droplets,
  restInShade: Trees,
  avoidMidday: Clock,
  stayCool: AirVent,
  airConOn: AirVent,
  stayIndoors: House,
  lessExertion: Activity,
  avoidExertion: Activity,
  avoidBusyRoads: Car,
  lessTimeOutside: Timer,
  watchSymptoms: HeartPulse,
  // lucide has no "closed window"; lowered blinds are the nearest match.
  windowsClosed: Blinds,
  enjoyOutdoors: Sun,
};

// Icon on every warning chip.
export const ENVI_WARNING_ICON: LucideIcon = TriangleAlert;
