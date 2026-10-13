// src/services/bookmarkStorage.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PLACE_LABEL_CONFIG } from '../config/placeLabelConfig';
import { BookmarkEntry, LegacyBookmarkEntry, PlaceCategory } from '../types/bookmark';

const STORAGE_KEY = 'monitored_bookmarks';

const LEGACY_TYPE_TO_CATEGORY: Record<LegacyBookmarkEntry['type'], PlaceCategory> = {
  house: 'Home',
  // A generic "place" can't be narrowed further without asking the user.
  place: 'Other Indoor',
};

// Older installs stored house/place bookmarks with no circle. updatedAt
// starts at 0 so they still sort as "never synced" and upload once.
export const migrateBookmark = (
  entry: BookmarkEntry | LegacyBookmarkEntry,
): BookmarkEntry => {
  if ('category' in entry) return entry;
  const { type, ...rest } = entry;
  return {
    ...rest,
    category: LEGACY_TYPE_TO_CATEGORY[type] ?? 'Other Indoor',
    radiusMeters: PLACE_LABEL_CONFIG.radius.defaultM,
    updatedAt: 0,
  };
};

// The persisted list is the single source of truth: useBookmarkList renders
// from it and placeLabelSyncService diffs against it. Reading it here (rather
// than trusting a hook's in-memory copy) matters because several hook
// instances are mounted at once and only some of them reload.
export const readBookmarks = async (): Promise<BookmarkEntry[]> => {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  const stored: (BookmarkEntry | LegacyBookmarkEntry)[] = JSON.parse(raw);
  const migrated = stored.map(migrateBookmark);
  if (stored.some(entry => !('category' in entry))) {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
  }
  return migrated;
};

export const writeBookmarks = (bookmarks: BookmarkEntry[]): Promise<void> =>
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(bookmarks));
