import { moveBookmarkTo } from '../bookmarkOrder';
import { BookmarkEntry } from '../../types/bookmark';

const place = (id: string, hidden?: boolean): BookmarkEntry => ({
  id,
  label: id,
  address: '',
  latitude: 22.3,
  longitude: 114.17,
  category: 'Home',
  radiusMeters: 25,
  updatedAt: 0,
  hidden,
});

const ids = (list: BookmarkEntry[]) => list.map(b => b.id);

describe('moveBookmarkTo', () => {
  it('moves a place to any position, shifting the ones in between', () => {
    const list = [place('a'), place('b'), place('c'), place('d')];
    expect(ids(moveBookmarkTo(list, 'a', 3))).toEqual(['b', 'c', 'd', 'a']);
    expect(ids(moveBookmarkTo(list, 'd', 0))).toEqual(['d', 'a', 'b', 'c']);
    expect(ids(moveBookmarkTo(list, 'b', 2))).toEqual(['a', 'c', 'b', 'd']);
  });

  it('counts toIndex within the place’s own section', () => {
    // Shown section is [a, b, c]; index 2 is its last slot.
    const list = [place('a'), place('x', true), place('b'), place('c')];
    expect(ids(moveBookmarkTo(list, 'a', 2))).toEqual(['b', 'x', 'c', 'a']);
  });

  it('keeps hidden places in their absolute slots when shown places move', () => {
    const list = [place('a'), place('x', true), place('b'), place('y', true), place('c')];
    expect(ids(moveBookmarkTo(list, 'c', 0))).toEqual(['c', 'x', 'a', 'y', 'b']);
  });

  it('moves hidden places only among hidden places', () => {
    const list = [place('x', true), place('a'), place('y', true)];
    expect(ids(moveBookmarkTo(list, 'y', 0))).toEqual(['y', 'a', 'x']);
  });

  it('clamps toIndex to the section', () => {
    const list = [place('a'), place('b'), place('x', true)];
    expect(ids(moveBookmarkTo(list, 'a', 99))).toEqual(['b', 'a', 'x']);
    expect(ids(moveBookmarkTo(list, 'b', -5))).toEqual(['b', 'a', 'x']);
  });

  it('is a no-op for the same position or an unknown id', () => {
    const list = [place('a'), place('b')];
    expect(ids(moveBookmarkTo(list, 'a', 0))).toEqual(['a', 'b']);
    expect(ids(moveBookmarkTo(list, 'missing', 1))).toEqual(['a', 'b']);
  });

  it('does not mutate the input list', () => {
    const list = [place('a'), place('b')];
    moveBookmarkTo(list, 'a', 1);
    expect(ids(list)).toEqual(['a', 'b']);
  });
});
