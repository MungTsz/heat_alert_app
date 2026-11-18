// src/utils/homeInfoBarLayout.ts
import { HOME_INFO_BAR_CONFIG } from '../config/homeLayoutConfig';

// How the side bar's four blocks are arranged.
export type HomeInfoBarArrangement = 'column' | 'grid';

const BLOCK_COUNT = 4;
const C = HOME_INFO_BAR_CONFIG;

// Height of the four blocks stacked in one column.
export const columnHeight = (): number =>
  BLOCK_COUNT * C.blockHeight + (BLOCK_COUNT - 1) * C.blockGap;

// One column while it fits the scene area above the cards; a 2 × 2 grid on
// short scenes (small phones), so the blocks never push the cards down.
export const homeInfoBarArrangement = (sceneAreaHeight: number): HomeInfoBarArrangement =>
  sceneAreaHeight >= columnHeight() ? 'column' : 'grid';

// Width the open bar takes from the screen's right edge (blocks + gap +
// tab). The scene's character re-centres in what is left.
export const homeInfoBarWidth = (arrangement: HomeInfoBarArrangement): number => {
  const blocks = arrangement === 'column' ? C.blockWidth : 2 * C.blockWidth + C.blockGap;
  return blocks + C.tabGap + C.tabWidth;
};
