// src/config/enviKeywordIcons.ts
import {
  Activity,
  AirVent,
  Armchair,
  Blinds,
  BriefcaseMedical,
  BusFront,
  CalendarMinus,
  Car,
  ClipboardList,
  Clock,
  DoorOpen,
  Droplets,
  Dumbbell,
  GlassWater,
  Hand,
  HeartPulse,
  House,
  LucideIcon,
  PillBottle,
  Sun,
  ThermometerSnowflake,
  Timer,
  Trees,
  TriangleAlert,
  Turtle,
} from 'lucide-react-native';
import { EnviActionId } from '../types/envi';

// The icon for each Environmental Index action keyword. Kept apart from
// enviKeywords.ts (like exposureIoIconConfig) so the pure keyword logic and
// its tests don't load icon components.
//
// One icon always means one thing, and the word is always shown under it.
// Keywords share an icon only when they ask for the same thing in
// different words or urgency — no set ever holds two of them:
// - Droplets: drink; Trees: shade; Clock: away from the hottest hours;
// - AirVent: get to air conditioning; Armchair: rest;
// - House: be indoors; DoorOpen: go inside;
// - Activity: less physical effort; Blinds: close the windows (lucide has
//   no "closed window"; lowered blinds are the nearest match).
export const ENVI_ACTION_ICONS: Record<EnviActionId, LucideIcon> = {
  drinkWater: Droplets,
  drinkBeforeThirsty: Droplets,
  carryWater: GlassWater,
  restInShade: Trees,
  waitInShade: Trees,
  moveToShade: Trees,
  avoidMidday: Clock,
  avoidMiddayOutings: Clock,
  stayCool: AirVent,
  airConOn: AirVent,
  airConWindowsUp: AirVent,
  keepRoomsCool: ThermometerSnowflake,
  slowDown: Turtle,
  stopActivity: Hand,
  restIfUnwell: Armchair,
  restOften: Armchair,
  stayIndoors: House,
  waitIndoors: House,
  goIndoors: DoorOpen,
  goIndoorsNow: DoorOpen,
  goIndoorsSoon: DoorOpen,
  headIndoors: DoorOpen,
  headIndoorsSooner: DoorOpen,
  lessExertion: Activity,
  avoidExertion: Activity,
  exerciseIndoors: Dumbbell,
  avoidBusyRoads: Car,
  avoidRoadsideWaits: BusFront,
  lessTimeOutside: Timer,
  fewerOutings: CalendarMinus,
  watchSymptoms: HeartPulse,
  windowsClosed: Blinds,
  windowsUp: Blinds,
  // lucide has no inhaler; the medical bag reads as "keep it with you".
  carryInhaler: BriefcaseMedical,
  followCarePlan: ClipboardList,
  keepMedicineCool: PillBottle,
  enjoyOutdoors: Sun,
};

// Icon on every warning chip.
export const ENVI_WARNING_ICON: LucideIcon = TriangleAlert;
