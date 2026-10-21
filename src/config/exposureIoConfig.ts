// src/config/exposureIoConfig.ts
import {
  EXPOSURE_INDOOR_IO_TYPES,
  EXPOSURE_IO_TYPES,
  EXPOSURE_TRANSIT_IO_TYPES,
  ExposureIo,
} from '../types/exposure';
import { PlaceCategory } from '../types/bookmark';

type ExposureIoPresentation = { color: string; label: string };

// Per-io colors shared by the trajectory map, both stacked-bar
// charts, the stay/trip sheets and the Community tab's place categories
// (placeCategoryConfig.ts reuses the indoor entries), so one io reads the
// same everywhere. Icons live in exposureIoIconConfig.ts.
//
// The meaning is carried by warmth, so a glance at a bar answers "was I out
// in it?" without the legend: Outdoor is the only bright warm hue, the
// indoor kinds are all cool (blue / teal / green). MTR takes the red of the
// MTR logo every HK rider already knows; Vehicle takes the remaining
// distinct hue, violet. Office/School stay off orange-ish hues so they never
// read as "outside".
//
// The hexes were picked by search, not by eye: every one of the 21 pairs
// (not just stack neighbours — a stack skips absent io types, so any two can
// touch, and the map mixes them freely) keeps OKLab ΔE ≥ 16.7 for normal
// vision and ≥ 9.2 under simulated protan/deutan CVD, and each is ≥ 3:1
// against white (icons on cards, white text on chips). Re-validate all
// pairs before changing any of them — e.g. the old violet Other Indoor next
// to a blue Office collapsed to ΔE 2.9 for deuteranopes.
export const EXPOSURE_IO_CONFIG: Record<ExposureIo, ExposureIoPresentation> = {
  // Orange (not the old amber) so a walk line can't be mistaken for Google
  // Maps' yellow-orange highways.
  Outdoor: { color: '#EA580C', label: 'Outdoor' },
  Vehicle: { color: '#7C3AED', label: 'Vehicle' },
  MTR: { color: '#991B1B', label: 'MTR' },
  'Other Indoor': { color: '#115E59', label: 'Other Indoor' },
  School: { color: '#059669', label: 'School' },
  Office: { color: '#0284C7', label: 'Office' },
  // Kept the deepest blue (as before) so existing users' "navy = home" holds.
  Home: { color: '#1E40AF', label: 'Home' },
};

// Indoor io types are the stays that get a category icon on the map (and
// the only ones a place label can produce).
export const isIndoorIo = (io: ExposureIo): io is PlaceCategory =>
  (EXPOSURE_INDOOR_IO_TYPES as readonly ExposureIo[]).includes(io);

// Legend chunks: three groups of 1 / 2 / 4 are easier to scan than seven
// loose swatches. Group order follows EXPOSURE_IO_TYPES (the stack order),
// so the legend reads left → right the way the bars stack bottom → top.
export const EXPOSURE_IO_GROUPS: readonly (readonly ExposureIo[])[] = [
  ['Outdoor'],
  EXPOSURE_TRANSIT_IO_TYPES,
  EXPOSURE_INDOOR_IO_TYPES,
];

// Plain-language "why this type" for the backend's `reason`, shown in the
// map sheets — a stay typed Home at 14:00 (or Other Indoor in an office)
// otherwise looks like a bug. The stay sheet's own note already suggests
// saving a place, so these only explain. Unknown reasons show nothing
// rather than a raw rule id.
export const EXPOSURE_IO_REASON_TEXT: Record<string, string> = {
  jump: 'Underground: no GPS between stations, so the dashed line is a straight guess',
  rail: 'Moved along a railway, away from roads',
  interchange: 'Short stop between two MTR rides',
  vehicle: 'Moved at road speed along roads',
  walk: 'Walking',
  place_label: 'Inside a saved place',
  night_stay: 'Stayed here overnight',
  near_night_stay: 'Close to where you stayed overnight',
  short_stop: 'Stopped for under 20 minutes',
  long_stay: 'Stayed 20+ minutes somewhere not saved as a place',
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
