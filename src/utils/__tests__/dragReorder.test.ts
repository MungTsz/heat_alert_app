import { dragShiftFor, dragTargetIndex } from '../dragReorder';

describe('dragTargetIndex', () => {
  it('snaps to the nearest slot', () => {
    expect(dragTargetIndex(1, 0, 50, 5)).toBe(1);
    expect(dragTargetIndex(1, 24, 50, 5)).toBe(1);
    expect(dragTargetIndex(1, 26, 50, 5)).toBe(2);
    expect(dragTargetIndex(1, 140, 50, 5)).toBe(4);
    expect(dragTargetIndex(3, -110, 50, 5)).toBe(1);
  });

  it('clamps to the ends of the list', () => {
    expect(dragTargetIndex(0, -500, 50, 5)).toBe(0);
    expect(dragTargetIndex(4, 500, 50, 5)).toBe(4);
  });

  it('stays put before the slot height is measured', () => {
    expect(dragTargetIndex(2, 300, 0, 5)).toBe(2);
  });
});

describe('dragShiftFor', () => {
  it('slides the rows between up when dragging down', () => {
    // a b c d e — b dragged onto d
    expect([0, 1, 2, 3, 4].map(i => dragShiftFor(i, 1, 3))).toEqual([0, 0, -1, -1, 0]);
  });

  it('slides the rows between down when dragging up', () => {
    // a b c d e — d dragged onto a
    expect([0, 1, 2, 3, 4].map(i => dragShiftFor(i, 3, 0))).toEqual([1, 1, 1, 0, 0]);
  });

  it('moves nothing while hovering over its own slot', () => {
    expect([0, 1, 2].map(i => dragShiftFor(i, 1, 1))).toEqual([0, 0, 0]);
  });
});
