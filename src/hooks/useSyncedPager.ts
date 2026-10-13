// src/hooks/useSyncedPager.ts
import { useCallback, useEffect, useRef } from 'react';
import { FlatList, NativeScrollEvent, NativeSyntheticEvent } from 'react-native';

// The paging FlatList ↔ caller-owned "current page" sync shared by the
// exposure week pager and hourly (day) pager. The caller owns `current`, so
// a swipe, the ‹ › buttons, a bar tap and a calendar pick all go through the
// same state; this hook only keeps the list's scroll position in line.
export const useSyncedPager = (
  pages: readonly string[],
  current: string,
  pageWidth: number,
  onPageChange: (page: string) => void,
) => {
  const index = Math.max(0, pages.indexOf(current));

  // Scrolls the list when `current` changes from OUTSIDE a swipe, or when
  // older history loads and prepends pages (shifting current's index).
  // pageRef tracks the page the list is actually showing, so a swipe — which
  // already landed on the right page — doesn't trigger a redundant scroll
  // back. Only a real change of `current` animates; an index shift from
  // prepended pages jumps silently so the visible page doesn't appear to move.
  const listRef = useRef<FlatList<string>>(null);
  const pageRef = useRef(index);
  const lastCurrentRef = useRef(current);
  useEffect(() => {
    const currentChanged = lastCurrentRef.current !== current;
    lastCurrentRef.current = current;
    if (pageRef.current === index) return;
    pageRef.current = index;
    listRef.current?.scrollToOffset({ offset: index * pageWidth, animated: currentChanged });
  }, [index, current, pageWidth]);

  const onMomentumScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const page = Math.round(e.nativeEvent.contentOffset.x / pageWidth);
      pageRef.current = page;
      const landed = pages[page];
      if (landed && landed !== current) onPageChange(landed);
    },
    [pages, current, pageWidth, onPageChange],
  );

  const getItemLayout = useCallback(
    (_: unknown, i: number) => ({ length: pageWidth, offset: pageWidth * i, index: i }),
    [pageWidth],
  );

  return { listRef, index, onMomentumScrollEnd, getItemLayout };
};
