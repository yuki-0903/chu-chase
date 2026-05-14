import * as Phaser from "phaser";
import { gameEvents } from "@/game/systems/GameEvents";

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super("PreloadScene");
  }

  preload() {
    const { width, height } = this.scale;
    const loadingText = this.add
      .text(width / 2, height / 2, "LOADING", {
        fontFamily: "Arial, Helvetica, sans-serif",
        fontSize: "24px",
        color: "#f7fbff"
      })
      .setOrigin(0.5);

    this.load.on(Phaser.Loader.Events.PROGRESS, (progress: number) => {
      loadingText.setText(`LOADING ${Math.round(progress * 100)}%`);
    });
  }

  create() {
    gameEvents.emit("assets:ready");
    this.scene.start("MainScene");
  }
}
