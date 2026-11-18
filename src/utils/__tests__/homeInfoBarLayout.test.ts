import { columnHeight, homeInfoBarArrangement, homeInfoBarWidth } from '../homeInfoBarLayout';
import { computeSceneLayout } from '../sceneLayout';
import { HOME_INFO_BAR_CONFIG } from '../../config/homeLayoutConfig';

describe('homeInfoBarArrangement', () => {
  it('stacks the blocks in one column when they fit the scene area', () => {
    expect(homeInfoBarArrangement(columnHeight())).toBe('column');
    expect(homeInfoBarArrangement(columnHeight() + 50)).toBe('column');
  });

  it('switches to a 2 × 2 grid on short scenes', () => {
    expect(homeInfoBarArrangement(columnHeight() - 1)).toBe('grid');
  });
});

describe('homeInfoBarWidth', () => {
  it('is wider for the grid than the column', () => {
    expect(homeInfoBarWidth('grid')).toBe(
      homeInfoBarWidth('column') + HOME_INFO_BAR_CONFIG.blockWidth + HOME_INFO_BAR_CONFIG.blockGap,
    );
  });
});

describe('computeSceneLayout with the side bar open', () => {
  it('moves the character left to clear the bar', () => {
    const full = computeSceneLayout(390, 844);
    const open = computeSceneLayout(390, 844, 390 - homeInfoBarWidth('column'));
    expect(open.characterCenterX).toBeLessThan(full.characterCenterX);
    // Only horizontal positions change.
    expect(open.bottomY).toBe(full.bottomY);
  });

  it('never pushes the thermometer off the left edge on a narrow screen', () => {
    const open = computeSceneLayout(320, 568, 320 - homeInfoBarWidth('grid'));
    expect(open.thermometerX).toBeGreaterThan(0);
  });
});
