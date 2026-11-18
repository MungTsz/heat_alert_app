// src/utils/sceneLayout.ts
import { SCENE_LAYOUT } from '../config/sceneConfig';

export type SceneLayout = {
  // The lawn's top edge (the skyline and harbour sit just above it).
  horizonY: number;
  // Where the characters' feet / paws touch the lawn.
  groundY: number;
  // The lowest pixel the characters draw (their shadows). Home sizes its
  // scene area from this so the cards never cover the characters.
  bottomY: number;
  personX: number;
  dogX: number;
};

export const computeSceneLayout = (width: number, height: number): SceneLayout => {
  const horizonY = height * SCENE_LAYOUT.horizonFraction;
  const groundY = horizonY + SCENE_LAYOUT.groundOffset;
  const personX = width * SCENE_LAYOUT.personXFraction;
  return {
    horizonY,
    groundY,
    bottomY: groundY + SCENE_LAYOUT.shadowBelowGround * SCENE_LAYOUT.characterScale,
    personX,
    dogX: personX + SCENE_LAYOUT.dogOffsetX * SCENE_LAYOUT.characterScale,
  };
};
