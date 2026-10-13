// src/utils/bookmarkOrder.ts
import { BookmarkEntry } from '../types/bookmark';

const isHidden = (bookmark: BookmarkEntry): boolean => bookmark.hidden === true;

// The Community list's manual order IS the stored array order. Shown and
// hidden places are listed in separate sections, so a move swaps with the
// nearest neighbour in the SAME section: moving a shown place never jumps
// over a hidden one, and a hidden place keeps its slot, so unhiding it later
// puts it back where it was relative to the others. Returns an unchanged
// copy when nothing moves — at either end of its section, or an unknown id.
export const moveBookmark = (
  bookmarks: readonly BookmarkEntry[],
  id: string,
  direction: -1 | 1,
): BookmarkEntry[] => {
  const from = bookmarks.findIndex(b => b.id === id);
  if (from === -1) return [...bookmarks];
  const hidden = isHidden(bookmarks[from]);

  let to = from + direction;
  while (to >= 0 && to < bookmarks.length && isHidden(bookmarks[to]) !== hidden) {
    to += direction;
  }
  if (to < 0 || to >= bookmarks.length) return [...bookmarks];

  const moved = [...bookmarks];
  [moved[from], moved[to]] = [moved[to], moved[from]];
  return moved;
};
