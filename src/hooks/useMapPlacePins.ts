// src/hooks/useMapPlacePins.ts
import { useMemo } from 'react';
import { usePlacesHeatIndex } from './useHeatData';
import { usePlacesAqhi } from './useAqhiData';
import { BookmarkEntry, PlaceCategory } from '../types/bookmark';

// A saved place as a map pin, with both hazards at its own coordinates.
export type MapPlacePin = {
  id: string;
  label: string;
  // Picks the pin's icon and colour, the same as the place's card.
  category: PlaceCategory;
  latitude: number;
  longitude: number;
  heatIndex: number | null; // null = loading / unavailable → "--"
  aqhi: number | null;
};

// The user's saved places for a map — the same lookups (and the same
// "hidden places are left out" rule) as the Places tab's cards, so a pin
// always agrees with its card. Called once by the screen and handed to
// every map it shows, so the preview and the full-screen map share one
// set of requests. The screen passes its own useBookmarkList() list, so a
// place it adds (Home's "Save this place as indoors") shows up at once.
export const useMapPlacePins = (bookmarks: readonly BookmarkEntry[]): MapPlacePin[] => {
  const visible = useMemo(() => bookmarks.filter(b => !b.hidden), [bookmarks]);
  const { heatIndexById } = usePlacesHeatIndex(visible);
  const { aqhiById } = usePlacesAqhi(visible);

  return useMemo(
    () =>
      visible.map(b => ({
        id: b.id,
        label: b.label,
        category: b.category,
        latitude: b.latitude,
        longitude: b.longitude,
        heatIndex: b.id in heatIndexById ? Math.round(heatIndexById[b.id]) : null,
        aqhi: b.id in aqhiById ? Math.round(aqhiById[b.id]) : null,
      })),
    [visible, heatIndexById, aqhiById],
  );
};
