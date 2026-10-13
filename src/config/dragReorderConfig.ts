// src/config/dragReorderConfig.ts

// Tuning for hold-and-drag list reordering (components/DraggableList.tsx).
export const DRAG_REORDER_CONFIG = {
  // How long the drag handle must be held before the row lifts. The hold is
  // what tells a drag apart from a scroll: a finger that moves sooner is
  // left to the parent ScrollView, which stays scrollable until the lift.
  holdDelayMs: 200,
  // Finger travel (px) before the lift that cancels the hold — past this
  // the touch reads as a scroll, not a pick-up.
  holdMoveTolerancePx: 8,
  // The lifted row's scale and Android elevation — just enough to read as
  // "picked up" above its neighbours.
  liftScale: 1.03,
  liftElevation: 8,
  // Neighbours sliding out of the way, and the dropped row settling into
  // its new slot.
  shiftDurationMs: 150,
  settleDurationMs: 120,
};
