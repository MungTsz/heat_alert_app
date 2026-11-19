// src/config/exposureIoIconConfig.ts
import {
  Briefcase,
  Building2,
  Bus,
  GraduationCap,
  House,
  LucideIcon,
  Mountain,
  TrainFront,
} from 'lucide-react-native';
import { ExposureIo } from '../types/exposure';
import { KnownLocationContext } from '../types/envi';

// Per-io icons, next to (not inside) EXPOSURE_IO_CONFIG: pure utils such as
// the hourly-row adapter import that config for normalizeExposureIo, and
// shouldn't pull in icon components with it (same split as
// placeLabelConfig.ts vs placeCategoryConfig.ts). Shown on the map's indoor
// stay dots, the sheet chips and the day timeline; the indoor ones are also
// the Places tab's place-category icons.
//
// Office and School show what you do there (briefcase, graduation cap)
// rather than a building, so the three non-home indoor kinds don't all read
// as "a building"; the generic building is left for Other Indoor. Outdoor is
// open air (Mountain) rather than footprints, which is already the Exposure
// tab's own nav icon.
export const EXPOSURE_IO_ICONS: Record<ExposureIo, LucideIcon> = {
  Outdoor: Mountain,
  // Bus rather than car: most HK vehicle time is buses/minibuses.
  Vehicle: Bus,
  MTR: TrainFront,
  'Other Indoor': Building2,
  School: GraduationCap,
  Office: Briefcase,
  Home: House,
};

// Home's "Where are you now?" choices wear the Exposure tab's icons for the
// same idea, so indoors / outdoors / on the move look alike everywhere.
export const LOCATION_CONTEXT_ICONS: Record<KnownLocationContext, LucideIcon> = {
  indoors: EXPOSURE_IO_ICONS['Other Indoor'],
  outdoors: EXPOSURE_IO_ICONS.Outdoor,
  transit: EXPOSURE_IO_ICONS.Vehicle,
};
