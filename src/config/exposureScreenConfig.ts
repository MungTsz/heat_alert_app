// src/config/exposureScreenConfig.ts
import type { HazardKind } from '../types/alerts';

// Words and limits for the Exposure tab. Worded around the person's own day
// ("My day", "Imported tracks") rather than the system's devices and ids.
export const EXPOSURE_SCREEN_COPY = {
  title: 'Exposure',
  myDayTitle: 'MY DAY',
  importedTitle: 'IMPORTED TRACKS',
  // The switch is right here, so the user never has to go and find it — and
  // the line says plainly that it uses location in the background.
  trackingOffText:
    'Track your day to see your exposure here. Uses your location even when the app is closed.',
  startTracking: 'Start tracking',
  todayLabel: "Today's exposure (%AR·h)",
  calculating: 'Calculating…',
  importedEmpty:
    'Tap + to import a GPS track and browse its exposure by date, kept apart from your own day.',
  placesHeading: 'At your places',
  // Each hazard's name as the Home cards show it.
  hazardNames: { heat: 'Heat index', aqhi: 'AQHI' } as Record<HazardKind, string>,
  // e.g. "Heat index up to 34°C", "AQHI up to 6" — the highest the API
  // reported during the stays.
  stayPeak: (hazard: string, value: string) => `${hazard} up to ${value}`,
  stayPeakUnavailable: (hazard: string) => `${hazard} --`,
};

export const EXPOSURE_PLACE_STAYS_CONFIG = {
  // Places listed under today's total, longest stay first — enough for a
  // typical day (home, work, one more) without turning the card into a list.
  maxPlaces: 3,
};
