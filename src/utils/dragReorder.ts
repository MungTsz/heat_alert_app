// src/utils/dragReorder.ts

// Pure index math for DraggableList, kept out of the component so it can be
// unit-tested without rendering. Rows are assumed to share one slot height
// (row + gap) — true for the single-line rows the list is used with.

// The index a row picked up at `from` would drop into after being dragged
// `dy` px: the nearest slot, clamped to the list.
export const dragTargetIndex = (
  from: number,
  dy: number,
  slotHeight: number,
  count: number,
): number => {
  if (slotHeight <= 0 || count <= 0) return from;
  return Math.max(0, Math.min(count - 1, from + Math.round(dy / slotHeight)));
};

// Which way the row at `index` slides (in slots) to make room while the row
// from `from` hovers over `target`: rows between the two close the gap
// left behind, everything else (and the dragged row itself) stays put.
export const dragShiftFor = (index: number, from: number, target: number): -1 | 0 | 1 => {
  if (index === from) return 0;
  if (from < target && index > from && index <= target) return -1;
  if (target < from && index >= target && index < from) return 1;
  return 0;
};
