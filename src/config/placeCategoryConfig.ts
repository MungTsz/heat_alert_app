// src/config/placeCategoryConfig.ts
import { LucideIcon } from 'lucide-react-native';
import { PlaceCategory } from '../types/bookmark';
import { EXPOSURE_IO_ICONS } from './exposureIoIconConfig';

// Order the category tiles appear in on the Add place sheet — the most
// common places first.
export const PLACE_CATEGORIES: readonly PlaceCategory[] = ['Home', 'Office', 'School', 'Other Indoor'];

type PlaceCategoryConfig = {
  label: string;
  // Shown once a tile is tapped, so the user knows exactly what the icon
  // means before confirming — a wrong category feeds a wrong io type to the
  // exposure API.
  description: string;
  Icon: LucideIcon;
};

// UI presentation only. Colors are intentionally NOT here (each category
// reuses its io color from EXPOSURE_IO_CONFIG), and icons are taken from
// EXPOSURE_IO_ICONS: a place reads the same color and icon on
// its card as its stays do on the exposure map. Default-naming rules live in
// placeLabelConfig.ts so the pure naming util doesn't depend on icon
// components.
export const PLACE_CATEGORY_CONFIG: Record<PlaceCategory, PlaceCategoryConfig> = {
  Home: { label: 'Home', description: 'Where you live', Icon: EXPOSURE_IO_ICONS.Home },
  Office: { label: 'Office', description: 'Where you work', Icon: EXPOSURE_IO_ICONS.Office },
  School: { label: 'School', description: 'Where you study', Icon: EXPOSURE_IO_ICONS.School },
  'Other Indoor': {
    label: 'Other Indoor',
    description: "Gym, mall, a friend's home…",
    Icon: EXPOSURE_IO_ICONS['Other Indoor'],
  },
};
