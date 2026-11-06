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
// Each hue follows an everyday association so the legend is rarely needed:
// red home, blue office, teal school, green outdoors, purple for any other
// building, brown for road vehicles. MTR keeps the dark red of the MTR logo
// every HK rider already knows.
//
// The exact hexes were picked by search, not by eye, over all 21 pairs (not
// just stack neighbours — a stack skips absent io types, so any two can
// touch, and the map mixes them freely), each ≥ 3:1 against white (icons on
// cards, white text on chips). A red Home plus a brown Vehicle can't reach
// the old floors (OKLab ΔE ≥ 16.7 normal, ≥ 9.2 protan/deutan CVD) — red
// and brown are close for protanopes whatever the shades — so this set
// maximises the worst pair instead: ΔE ≥ 11.4 normal and ≥ 5.1 under CVD,
// both Vehicle/MTR — the weak spot, softened by their distinct icons (bus
// vs train) in the legend and sheets. Re-validate all pairs before changing
// any of them — e.g. an orange-red Home next to a brown collapses to ΔE 3
// for protanopes, and purple next to a darker blue Office to ΔE 2 for
// deuteranopes.
export const EXPOSURE_IO_CONFIG: Record<ExposureIo, ExposureIoPresentation> = {
  // Emerald, not a yellow-green: those collapse onto Home's red under
  // deuteranopia (ΔE 5).
  Outdoor: { color: '#059669', label: 'Outdoor' },
  // Dark brown that still reads as brown, not black. Of the browns tried this
  // keeps the most CVD distance from both reds: redder/warmer browns
  // (e.g. #8B4513) collapse onto MTR for deuteranopes (ΔE 2).
  Vehicle: { color: '#6D4C41', label: 'Vehicle' },
  MTR: { color: '#991B1B', label: 'MTR' },
  'Other Indoor': { color: '#7E22CE', label: 'Other Indoor' },
  // Cyan-teal rather than green-teal, to keep a hue gap from Outdoor.
  School: { color: '#0E7490', label: 'School' },
  Office: { color: '#3B82F6', label: 'Office' },
  Home: { color: '#DC2626', label: 'Home' },
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
  jump: 'Underground: no GPS between stations, so the line is a straight guess',
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
