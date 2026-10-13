import { useCallback, useEffect, useState } from 'react';
import { BookmarkEntry } from '../types/bookmark';
import { readBookmarks, writeBookmarks } from '../services/bookmarkStorage';
import { syncPlaceLabels } from '../services/placeLabelSyncService';

// Fire-and-forget: sync failures must never block the UI, and the next
// load/add/remove re-runs the full diff anyway.
const syncInBackground = () => {
  syncPlaceLabels().catch(error => console.log('Place label sync failed:', error));
};

export const useBookmarkList = () => {
  const [bookmarks, setBookmarks] = useState<BookmarkEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const loadBookmarks = useCallback(async () => {
    try {
      setBookmarks(await readBookmarks());
      // Also the retry path for anything a previous session failed to sync.
      syncInBackground();
    } catch (error) {
      console.log('Failed to load bookmarks:', error);
      setBookmarks([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBookmarks();
  }, [loadBookmarks]);

  const persist = async (updated: BookmarkEntry[]) => {
    setBookmarks(updated);
    await writeBookmarks(updated);
  };

  const addBookmark = async (bookmark: Omit<BookmarkEntry, 'id' | 'updatedAt'>) => {
    const now = Date.now();
    await persist([...bookmarks, { ...bookmark, id: `bookmark-${now}`, updatedAt: now }]);
    syncInBackground();
  };

  const removeBookmark = async (id: string) => {
    await persist(bookmarks.filter(b => b.id !== id));
    syncInBackground();
  };

  // Leaves updatedAt alone: the name is never uploaded, so a rename has
  // nothing to sync.
  const renameBookmark = async (id: string, label: string) => {
    await persist(bookmarks.map(b => (b.id === id ? { ...b, label } : b)));
  };

  return { bookmarks, loading, addBookmark, removeBookmark, renameBookmark };
};
