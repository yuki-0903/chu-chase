import { NEU_COLOR_STRINGS } from "@/game/config/neumorphismPalette";

export const BASE_GAME_WIDTH = 960;
export const BASE_GAME_HEIGHT = 540;
export const BACKGROUND_COLOR = NEU_COLOR_STRINGS.bg;

export function getGameSize(parent: HTMLElement) {
  const bounds = parent.getBoundingClientRect();

  return {
    width: Math.max(1, Math.floor(parent.clientWidth || bounds.width || window.innerWidth)),
    height: Math.max(1, Math.floor(parent.clientHeight || bounds.height || window.innerHeight))
  };
}
