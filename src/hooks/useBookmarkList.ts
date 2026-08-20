import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BookmarkEntry } from '../types/bookmark';

const STORAGE_KEY = 'monitored_bookmarks';

export const useBookmarkList = () => {
  const [bookmarks, setBookmarks] = useState<BookmarkEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const loadBookmarks = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      setBookmarks(raw ? JSON.parse(raw) : []);
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

  const addBookmark = async (bookmark: Omit<BookmarkEntry, 'id'>) => {
    const newBookmark: BookmarkEntry = {
      ...bookmark,
      id: `bookmark-${Date.now()}`,
    };
    const updated = [...bookmarks, newBookmark];
    setBookmarks(updated);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const removeBookmark = async (id: string) => {
    const updated = bookmarks.filter(b => b.id !== id);
    setBookmarks(updated);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  return { bookmarks, loading, addBookmark, removeBookmark };
};
