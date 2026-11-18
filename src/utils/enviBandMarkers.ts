// src/utils/enviBandMarkers.ts
import { ENVI_LEVELS } from '../config/enviConfig';

export type EnviMarkerKind = 'now' | 'peak';

// Where a marker's label sits relative to its own band cell:
// - 'center'       centred over the arrow
// - 'endAtArrow'   text ends at the arrow (runs left)
// - 'startAtArrow' text starts at the arrow (runs right)
// - 'cellStart'    text starts at the cell's left edge (first cell)
// - 'cellEnd'      text ends at the cell's right edge (last cell)
export type EnviMarkerAlign = 'center' | 'endAtArrow' | 'startAtArrow' | 'cellStart' | 'cellEnd';

export type EnviMarker = { kind: EnviMarkerKind; level: number; align: EnviMarkerAlign };

const LOWEST = ENVI_LEVELS[0].level;
const HIGHEST = ENVI_LEVELS[ENVI_LEVELS.length - 1].level;

// The band's arrows and how their labels are placed. "Now" is always shown
// (when there is a level); "Today's peak" only when it is a higher level.
// Labels are wider than a cell, so:
// 1. The first and last cells pin their label to the card side, so it never
//    runs past the card edge.
// 2. Next-door levels push their labels apart: the lower one ends at its
//    arrow, the higher one starts at its arrow.
// 3. Otherwise the label is centred over its arrow.
export const enviBandMarkers = (now: number | null, peak: number | null): EnviMarker[] => {
  if (now === null) return [];
  const markers: { kind: EnviMarkerKind; level: number }[] = [{ kind: 'now', level: now }];
  if (peak !== null && peak > now) markers.push({ kind: 'peak', level: peak });

  const nextDoor = markers.length === 2 && markers[1].level - markers[0].level === 1;
  return markers.map(({ kind, level }) => {
    let align: EnviMarkerAlign = 'center';
    if (level === LOWEST) align = 'cellStart';
    else if (level === HIGHEST) align = 'cellEnd';
    else if (nextDoor) align = kind === 'now' ? 'endAtArrow' : 'startAtArrow';
    return { kind, level, align };
  });
};
