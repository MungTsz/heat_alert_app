// src/utils/exposureLastTrackedDate.ts
import { DailyExposureEntry } from '../types/exposure';

// Picks the most recent date that actually has a tracked report, so a
// device screen's default view (before the user has explicitly picked a
// date) never lands on an empty/still-loading "today" when older data
// exists. Prefers todayKey only when the caller already has a real report
// for it (todayHasData) and it isn't older than the newest history entry;
// falls back to todayKey when there's no history at all, matching the
// existing loading/empty-state behavior for a brand-new tracker.
export const getLastTrackedDate = (
  history: DailyExposureEntry[],
  todayKey: string,
  todayHasData: boolean,
): string => {
  const lastHistoryDate = history.reduce<string | null>(
    (latest, entry) => (!latest || entry.date > latest ? entry.date : latest),
    null,
  );
  if (todayHasData && (!lastHistoryDate || todayKey >= lastHistoryDate)) return todayKey;
  return lastHistoryDate ?? todayKey;
};
