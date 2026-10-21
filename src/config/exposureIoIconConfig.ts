// src/config/exposureIoIconConfig.ts
import {
  Building2,
  Bus,
  DoorOpen,
  Footprints,
  House,
  LucideIcon,
  School,
  TrainFront,
} from 'lucide-react-native';
import { ExposureIo } from '../types/exposure';

// Per-io icons, next to (not inside) EXPOSURE_IO_CONFIG: pure utils such as
// the hourly-row adapter import that config for normalizeExposureIo, and
// shouldn't pull in icon components with it (same split as
// placeLabelConfig.ts vs placeCategoryConfig.ts). Shown on the map's indoor
// stay dots, the sheet chips and the day timeline; the indoor ones are also
// the Community tab's place-category icons.
export const EXPOSURE_IO_ICONS: Record<ExposureIo, LucideIcon> = {
  Outdoor: Footprints,
  // Bus rather than car: most HK vehicle time is buses/minibuses.
  Vehicle: Bus,
  MTR: TrainFront,
  'Other Indoor': DoorOpen,
  School: School,
  Office: Building2,
  Home: House,
};
