// src/config/exposureScreenConfig.ts
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
  placesHeading: 'Highest at your places',
  // Same 2 decimals as the day's total above it.
  placeExposure: (value: number) => `${value.toFixed(2)} %AR·h`,
};

export const EXPOSURE_PLACE_STAYS_CONFIG = {
  // Saved places listed under today's total, highest exposure first —
  // enough for a typical day (home, work, one more) without turning the
  // card into a list.
  maxPlaces: 3,
};
