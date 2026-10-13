// src/utils/bookmarkOrder.ts
import { BookmarkEntry } from '../types/bookmark';

const isHidden = (bookmark: BookmarkEntry): boolean => bookmark.hidden === true;

// The Community list's manual order IS the stored array order. Shown and
// hidden places are listed in separate sections, so a drag only reorders
// the place's OWN section: toIndex is a position within that section, and
// places of the other section keep their absolute slots — so dragging a
// shown place never moves a hidden one, and unhiding a place later puts it
// back where it was relative to the others. toIndex is clamped to the
// section; returns an unchanged copy when nothing moves (same position, or
// an unknown id).
export const moveBookmarkTo = (
  bookmarks: readonly BookmarkEntry[],
  id: string,
  toIndex: number,
): BookmarkEntry[] => {
  const from = bookmarks.findIndex(b => b.id === id);
  if (from === -1) return [...bookmarks];
  const hidden = isHidden(bookmarks[from]);

  // Absolute indexes of the moved place's section, in order.
  const slots = bookmarks.flatMap((b, i) => (isHidden(b) === hidden ? [i] : []));
  const section = slots.map(i => bookmarks[i]);
  const fromPos = slots.indexOf(from);
  const toPos = Math.max(0, Math.min(section.length - 1, toIndex));
  if (toPos === fromPos) return [...bookmarks];

  const [moved] = section.splice(fromPos, 1);
  section.splice(toPos, 0, moved);
  const result = [...bookmarks];
  slots.forEach((slot, k) => {
    result[slot] = section[k];
  });
  return result;
};
