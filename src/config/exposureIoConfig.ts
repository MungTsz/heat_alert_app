// src/config/exposureIoConfig.ts
import { EXPOSURE_IO_TYPES, ExposureIo } from '../types/exposure';

// Per-io colors shared by the trajectory map dots and both stacked-bar
// charts, so one io reads the same color everywhere in the exposure tab.
// Every io gets its own distinct HUE (never a lighter/darker shade of
// another io's color) so they can't be confused on a small dot or thin bar
// segment. The indoor kinds are all cool hues (purple, green, teal, dark
// blue) to read as a group, while Outdoor is the only warm hue for maximum
// contrast against them. These are also the Community tab's place-category
// colors (see placeCategoryConfig.ts), so a labelled place reads the same
// color on its card, its map circle and in the exposure charts.
export const EXPOSURE_IO_CONFIG: Record<ExposureIo, { color: string; label: string }> = {
  // Darker burnt-amber (not a lighter gold): the map tiles render in light
  // mode, where a light yellow washes out against roads/land.
  Outdoor: { color: '#C2790C', label: 'Outdoor' },
  'Other Indoor': { color: '#8B5CF6', label: 'Other Indoor' },
  School: { color: '#15803D', label: 'School' },
  Office: { color: '#0E7490', label: 'Office' },
  Home: { color: '#1E3A8A', label: 'Home' },
};

// Maps a raw backend io string onto a known ExposureIo. Rows cached before
// the backend split indoor into Home/Other Indoor still say 'Indoor' — with
// no stay start time to apply the Home window to, Other Indoor is the safe
// reading. Unknown future types fall back by name so a new backend value
// degrades gracefully instead of crashing a color/totals lookup.
export const normalizeExposureIo = (raw: string): ExposureIo => {
  if ((EXPOSURE_IO_TYPES as readonly string[]).includes(raw)) return raw as ExposureIo;
  return /indoor/i.test(raw) ? 'Other Indoor' : 'Outdoor';
};
