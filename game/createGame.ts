import type * as Phaser from "phaser";
import { BACKGROUND_COLOR, getGameSize } from "@/game/config/gameConfig";
import { BootScene } from "@/game/scenes/BootScene";
import { MainScene } from "@/game/scenes/MainScene";
import { PreloadScene } from "@/game/scenes/PreloadScene";

export async function createGame(parent: HTMLElement): Promise<Phaser.Game> {
  const PhaserRuntime = await import("phaser");
  const { width, height } = getGameSize(parent);

  return new PhaserRuntime.Game({
    type: PhaserRuntime.AUTO,
    parent,
    width,
    height,
    backgroundColor: BACKGROUND_COLOR,
    pixelArt: false,
    antialias: true,
    scale: {
      mode: PhaserRuntime.Scale.RESIZE,
      autoCenter: PhaserRuntime.Scale.CENTER_BOTH,
      width,
      height
    },
    physics: {
      default: "arcade",
      arcade: {
        gravity: { x: 0, y: 0 },
        debug: false
      }
    },
    scene: [BootScene, PreloadScene, MainScene]
  });
}
