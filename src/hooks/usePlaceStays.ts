// src/hooks/usePlaceStays.ts
import { useMemo } from 'react';
import { ExposureReport } from '../types/exposure';
import { EXPOSURE_PLACE_STAYS_CONFIG } from '../config/exposureScreenConfig';
import { PlaceStay, summarizePlaceStays } from '../utils/placeStays';
import { useBookmarkList } from './useBookmarkList';

// Today's top saved places by exposure — the line that ties Exposure to
// Places. Read straight from today's report, so it needs no extra requests
// and always adds up with the day's total above it.
export const usePlaceStays = (report: ExposureReport | null): PlaceStay[] => {
  const { bookmarks } = useBookmarkList();
  return useMemo(
    () =>
      report
        ? summarizePlaceStays(report.segments, bookmarks).slice(
            0,
            EXPOSURE_PLACE_STAYS_CONFIG.maxPlaces,
          )
        : [],
    [report, bookmarks],
  );
};
