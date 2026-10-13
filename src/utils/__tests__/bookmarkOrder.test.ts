import { moveBookmark } from '../bookmarkOrder';
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

describe('moveBookmark', () => {
  it('swaps a place with its neighbour', () => {
    const list = [place('a'), place('b'), place('c')];
    expect(ids(moveBookmark(list, 'b', -1))).toEqual(['b', 'a', 'c']);
    expect(ids(moveBookmark(list, 'b', 1))).toEqual(['a', 'c', 'b']);
  });

  it('skips over places in the other section', () => {
    const list = [place('a'), place('x', true), place('b')];
    expect(ids(moveBookmark(list, 'b', -1))).toEqual(['b', 'x', 'a']);
  });

  it('keeps hidden places in their slots when shown places move', () => {
    const list = [place('a'), place('x', true), place('b'), place('y', true)];
    const moved = moveBookmark(list, 'a', 1);
    expect(ids(moved)).toEqual(['b', 'x', 'a', 'y']);
  });

  it('moves hidden places only among hidden places', () => {
    const list = [place('x', true), place('a'), place('y', true)];
    expect(ids(moveBookmark(list, 'y', -1))).toEqual(['y', 'a', 'x']);
  });

  it('is a no-op at either end of a section, or for an unknown id', () => {
    const list = [place('a'), place('b'), place('x', true)];
    expect(ids(moveBookmark(list, 'a', -1))).toEqual(['a', 'b', 'x']);
    expect(ids(moveBookmark(list, 'b', 1))).toEqual(['a', 'b', 'x']);
    expect(ids(moveBookmark(list, 'missing', 1))).toEqual(['a', 'b', 'x']);
  });

  it('does not mutate the input list', () => {
    const list = [place('a'), place('b')];
    moveBookmark(list, 'a', 1);
    expect(ids(list)).toEqual(['a', 'b']);
  });
});
