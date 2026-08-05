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
  const horizonY = height * 0.3; // was 0.34 — nudged up further
  const groundY = horizonY + 15;

  const headR = 22;
  const bodyH = 46;

  const characterCenterX = width * 0.76;
  const petCx = characterCenterX - 48 * SCENE_SCALE;
  const thermometerX = petCx - 56 * SCENE_SCALE;

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
