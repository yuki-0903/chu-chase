import type { StageVariant } from "./protocol";

export interface StageWall {
  height: number;
  width: number;
  x: number;
  y: number;
}

export const MAZE_WALLS: StageWall[] = [
  { x: 0, y: -5.2, width: 0.58, height: 7 },
  { x: 0, y: 5.6, width: 0.58, height: 6.2 },
  { x: -6.2, y: 1.2, width: 0.58, height: 8.5 },
  { x: 6.2, y: -1.2, width: 0.58, height: 8.5 },
  { x: -3.2, y: -7.1, width: 6.4, height: 0.58 },
  { x: 3.2, y: 7.1, width: 6.4, height: 0.58 },
  { x: -6.5, y: -4.2, width: 4.6, height: 0.58 },
  { x: 6.5, y: 4.2, width: 4.6, height: 0.58 }
];

export function getStageWalls(stageVariant: StageVariant) {
  return stageVariant === "maze" ? MAZE_WALLS : [];
}
