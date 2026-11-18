// src/utils/sceneLayout.ts
export const SCENE_SCALE = 1.15;

// Horizontal offsets of the scene's group, from the character's centre.
const PET_OFFSET_X = 55;
const THERMOMETER_OFFSET_X = 65;
// The character sits a little right of centre, leaving room on its left for
// the dog and the thermometer.
const CHARACTER_CENTER_RATIO = 0.56;
// The thermometer never comes closer than this to the screen's left edge,
// however narrow the available width (Home's side bar open on a small phone).
const MIN_LEFT_MARGIN = 20;

export type SceneLayout = {
  horizonY: number;
  groundY: number;
  topY: number;
  bottomY: number;
  bandHeight: number;
  characterCenterX: number;
  petCx: number;
  thermometerX: number;
};

// `availableWidth` is the part of the screen, from the left, the group may
// use: the full width normally, less Home's side bar while it is open, so
// the bar never covers the character. The sky and haze still fill `width`.
export const computeSceneLayout = (
  width: number,
  height: number,
  availableWidth: number = width,
): SceneLayout => {
  const horizonY = height * 0.3;
  const groundY = horizonY + 15;

  const headR = 22;
  const bodyH = 46;

  // Character + dog centred as a group, with the thermometer to their left.
  const characterCenterX = Math.max(
    availableWidth * CHARACTER_CENTER_RATIO,
    MIN_LEFT_MARGIN + PET_OFFSET_X + THERMOMETER_OFFSET_X,
  );
  const petCx = characterCenterX - PET_OFFSET_X;
  const thermometerX = petCx - THERMOMETER_OFFSET_X;

  const topOffset = (bodyH + headR * 2) * SCENE_SCALE;
  const bottomOffset = 14 * SCENE_SCALE;

  const topY = groundY - topOffset;
  const bottomY = groundY + bottomOffset;

  return {
    horizonY,
    groundY,
    topY,
    bottomY,
    bandHeight: bottomY - topY,
    characterCenterX,
    petCx,
    thermometerX,
  };
};
