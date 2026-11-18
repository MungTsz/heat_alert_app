// src/utils/sceneLayout.ts
export const SCENE_SCALE = 1.15;

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

export const computeSceneLayout = (
  width: number,
  height: number,
): SceneLayout => {
  const horizonY = height * 0.3;
  const groundY = horizonY + 15;

  const headR = 22;
  const bodyH = 46;

  // Character + dog now centered as a group on the canvas, with the
  // thermometer positioned to their left — matches "whole set should be
  // in the middle" rather than pushed to the right side.
  const characterCenterX = width * 0.56;
  const petCx = characterCenterX - 55;
  const thermometerX = petCx - 65;

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
