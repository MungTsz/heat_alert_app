// src/config/placeLabelConfig.ts
import Config from 'react-native-config';
import { isExposureApiConfigured } from './exposureApiConfig';
import { PlaceCategory } from '../types/bookmark';
import { PlaceNameLevel } from '../types/placeLookup';

export const PLACE_LABEL_CONFIG = {
  radius: {
    // Roughly one HK residential/office tower footprint — tight enough that
    // a Home and an Office one street apart don't swallow each other.
    defaultM: 25,
    // Below ~10 m the circle is smaller than typical phone GPS error, so a
    // stay could never reliably land inside it.
    minM: 10,
    // Large enough for a whole university campus.
    maxM: 200,
    stepM: 5,
  },
  // How much wider than the circle's diameter the map view spans, so the
  // circle sits comfortably inside the visible area with context around it.
  previewPaddingFactor: 3,
  // Where the place picker opens when the current location is unknown
  // (permission denied / GPS still locating) — central Kowloon.
  fallbackCenter: { latitude: 22.3193, longitude: 114.1694 },
  // Lower bound for the map span — at the minimum radius the circle would
  // otherwise zoom in past street level and lose all orientation.
  minPreviewDeltaDeg: 0.0015,
  circleFillOpacityHex: '33', // ~20% — the map underneath must stay readable
  otherPlaceFillOpacityHex: '1A', // ~10% — other places are context only
  conflictStrokeColor: '#D9534F',
  naming: {
    // "Core · detail" combos longer than this are replaced by a numbered
    // suffix instead — the card label is a single line.
    maxCombinedLength: 32,
    detailSeparator: ' · ',
    // Which named-area level is the most natural "core" name for each kind of
    // place, most preferred first (see utils/placeNaming.ts). A school is
    // known by its campus, not the building the pin happens to land on; a
    // home by its estate; an office by its tower.
    levelPriority: {
      Home: ['estate', 'building', 'street', 'locality'],
      Office: ['building', 'estate', 'street', 'locality'],
      School: ['institution', 'building', 'street', 'locality'],
      'Other Indoor': ['venue', 'building', 'estate', 'street', 'locality'],
    } as Record<PlaceCategory, readonly PlaceNameLevel[]>,
  },
  // Overlap math tolerates this much — haversine rounding shouldn't turn a
  // "shrink to 15 m" suggestion into 10 m over a few centimetres.
  overlapToleranceM: 0.5,
  // The place-labels endpoint doesn't exist on the backend yet, so syncing
  // stays off until explicitly enabled — otherwise every bookmark change
  // would log a 404.
  syncEnabled: Config.PLACE_LABEL_SYNC_ENABLED === 'true',
};

export const isPlaceLabelApiConfigured = (): boolean =>
  isExposureApiConfigured() && PLACE_LABEL_CONFIG.syncEnabled;
