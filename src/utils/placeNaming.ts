// src/utils/placeNaming.ts
import { PLACE_LABEL_CONFIG } from '../config/placeLabelConfig';
import { PlaceCategory } from '../types/bookmark';
import { OsmTags, PlaceContext, PlaceNameLevel } from '../types/placeLookup';

type NameCandidate = {
  level: PlaceNameLevel;
  name: string;
  // Smaller = more specific; null (Nominatim-derived) sorts after any known size.
  areaDeg2: number | null;
};

const INSTITUTION_AMENITIES = ['university', 'college', 'school', 'kindergarten', 'hospital'];
const VENUE_KEYS = ['shop', 'leisure', 'amenity', 'tourism'];
const LOCALITY_PLACES = ['neighbourhood', 'quarter', 'suburb', 'hamlet', 'village'];
// Nominatim address keys from most to least local — HK's "suburb" is a whole
// district, so it's only the last resort.
const LOCALITY_ADDRESS_KEYS = ['neighbourhood', 'quarter', 'hamlet', 'village', 'suburb'];

// Levels that may be appended to a taken core name to tell two places apart,
// coarse → fine. Venues are left out on purpose: "HKUST · UniBistro & Bar"
// would name a classroom after the café the pin happened to land nearest.
const DETAIL_LEVELS: readonly PlaceNameLevel[] = ['estate', 'building', 'street'];
const GRANULARITY: readonly PlaceNameLevel[] = [
  'locality',
  'institution',
  'estate',
  'building',
  'street',
  'venue',
];

const CJK = /[　-〿㐀-鿿豈-﫿＀-￯]/;
const LEADING_ARTICLE = /^the\s+/i;

const normalizeForCompare = (name: string): string => name.trim().toLowerCase();

export const isNameTaken = (name: string, existingNames: readonly string[]): boolean => {
  const target = normalizeForCompare(name);
  return existingNames.some(existing => normalizeForCompare(existing) === target);
};

// Shared by every place-rename input so they all enforce the same rules —
// returns a user-facing error, or null when the name is fine. Duplicate names
// are refused because the Community list would show two identical cards.
export const validatePlaceName = (
  name: string,
  existingNames: readonly string[],
): string | null => {
  if (!name.trim()) return 'Please enter a name.';
  if (isNameTaken(name, existingNames)) return `You already have a place called "${name.trim()}".`;
  return null;
};

// HK OSM names are often bilingual in one string ("香港科技大學 The Hong Kong
// University of Science and Technology") — keep the English half to match
// the app's UI language. A purely Chinese name is kept as-is: it's still
// better than no name at all.
const toEnglishPart = (name: string): string => {
  if (!CJK.test(name)) return name;
  const latinOnly = name.replace(new RegExp(CJK.source, 'g'), '').replace(/\s+/g, ' ').trim();
  return /[A-Za-z]/.test(latinOnly) ? latinOnly : name.trim();
};

const tidy = (name: string): string => toEnglishPart(name).replace(LEADING_ARTICLE, '').trim();

// Picks the shortest well-known form of an OSM object's name: an official
// short name ("HKUST", "ICC") beats the full one. Never truncates — a cut
// name like "Hong Kong University of" reads worse than a long one the card
// can ellipsize.
export const pickDisplayName = (tags: OsmTags): string | null => {
  const shortEn = tags['short_name:en'];
  if (shortEn) return tidy(shortEn);
  const short = tags.short_name;
  if (short && !CJK.test(short)) return tidy(short);
  const full = tags['name:en'] || tags.name;
  return full ? tidy(full) || null : null;
};

// Which naming level an enclosing OSM area belongs to; null for areas that
// make poor place names (administrative boundaries, plazas, roads).
export const classifyArea = (tags: OsmTags): PlaceNameLevel | null => {
  if (tags.boundary || tags.admin_level) return null;
  if (INSTITUTION_AMENITIES.includes(tags.amenity)) return 'institution';
  if (tags.landuse === 'residential' || tags.residential || tags.place === 'city_block') {
    return 'estate';
  }
  if (LOCALITY_PLACES.includes(tags.place)) return 'locality';
  if (tags.building) return 'building';
  if (VENUE_KEYS.some(key => tags[key])) return 'venue';
  return null;
};

const collectCandidates = (context: PlaceContext): NameCandidate[] => {
  const candidates: NameCandidate[] = [];

  for (const area of context.enclosingAreas) {
    const level = classifyArea(area.tags);
    const name = level ? pickDisplayName(area.tags) : null;
    if (level && name) candidates.push({ level, name, areaDeg2: area.areaDeg2 });
  }

  const reverse = context.reverse;
  if (reverse) {
    const { address } = reverse;
    // Nominatim's matched object is usually the POI nearest the pin — a
    // venue, or an institution when it's the school itself.
    const objectName = reverse.namedetails
      ? pickDisplayName(reverse.namedetails)
      : reverse.name
        ? tidy(reverse.name)
        : null;
    if (objectName && reverse.category && VENUE_KEYS.includes(reverse.category)) {
      const level: PlaceNameLevel =
        reverse.category === 'amenity' && INSTITUTION_AMENITIES.includes(reverse.type ?? '')
          ? 'institution'
          : 'venue';
      candidates.push({ level, name: objectName, areaDeg2: null });
    }
    if (address.building) {
      candidates.push({ level: 'building', name: tidy(address.building), areaDeg2: null });
    }
    if (address.residential) {
      candidates.push({ level: 'estate', name: tidy(address.residential), areaDeg2: null });
    }
    if (address.road) {
      const street = address.house_number
        ? `${address.house_number} ${address.road}`
        : address.road;
      candidates.push({ level: 'street', name: tidy(street), areaDeg2: null });
    }
    const locality = LOCALITY_ADDRESS_KEYS.map(key => address[key]).find(Boolean);
    if (locality) candidates.push({ level: 'locality', name: tidy(locality), areaDeg2: null });
  }

  return candidates;
};

const bySpecificity = (a: NameCandidate, b: NameCandidate): number =>
  (a.areaDeg2 ?? Infinity) - (b.areaDeg2 ?? Infinity);

// Builds the name a newly added place gets without the user typing anything:
// the most natural "core" name for its category (campus for a school, estate
// for a home…). If the user already has a place by that name, a finer detail
// is appended ("HKUST · Academic Building"), and only when that doesn't help
// a number ("HKUST 2"). With no usable location data it falls back to the
// category label ("Home", "Home 2").
export const buildDefaultPlaceName = (
  context: PlaceContext,
  category: PlaceCategory,
  existingNames: readonly string[],
): string => {
  const { maxCombinedLength, detailSeparator, levelPriority } = PLACE_LABEL_CONFIG.naming;
  const candidates = collectCandidates(context);
  const atLevel = (level: PlaceNameLevel) =>
    candidates.filter(c => c.level === level).sort(bySpecificity);

  const coreCandidate = levelPriority[category]
    .map(level => atLevel(level)[0])
    .find(Boolean);
  // The category value doubles as its display label ("Home", "Other Indoor").
  const core = coreCandidate?.name ?? category;
  if (!isNameTaken(core, existingNames)) return core;

  if (coreCandidate) {
    const coreRank = GRANULARITY.indexOf(coreCandidate.level);
    const details = DETAIL_LEVELS.filter(level => GRANULARITY.indexOf(level) > coreRank)
      .flatMap(atLevel)
      .map(c => c.name)
      // A detail that repeats the core ("HKUST · HKUST Piazza") adds nothing.
      .filter(name => !normalizeForCompare(name).includes(normalizeForCompare(core)));
    for (const detail of details) {
      const combined = `${core}${detailSeparator}${detail}`;
      if (combined.length <= maxCombinedLength && !isNameTaken(combined, existingNames)) {
        return combined;
      }
    }
  }

  for (let n = 2; ; n++) {
    const numbered = `${core} ${n}`;
    if (!isNameTaken(numbered, existingNames)) return numbered;
  }
};
