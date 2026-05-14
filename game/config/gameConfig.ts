export const BASE_GAME_WIDTH = 960;
export const BASE_GAME_HEIGHT = 540;
export const BACKGROUND_COLOR = "#05070f";

export function getGameSize(parent: HTMLElement) {
  const bounds = parent.getBoundingClientRect();

  return {
    width: Math.max(1, Math.floor(bounds.width || window.innerWidth)),
    height: Math.max(1, Math.floor(bounds.height || window.innerHeight))
  };
}
