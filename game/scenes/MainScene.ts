import * as Phaser from "phaser";
import { BACKGROUND_COLOR } from "@/game/config/gameConfig";
import { gameEvents } from "@/game/systems/GameEvents";
import { InputController } from "@/game/systems/InputController";

export class MainScene extends Phaser.Scene {
  private inputController?: InputController;
  private label?: Phaser.GameObjects.Text;

  constructor() {
    super("MainScene");
  }

  create() {
    this.cameras.main.setBackgroundColor(BACKGROUND_COLOR);
    this.inputController = new InputController(this);
    this.createPlaceholder();
    this.scale.on(Phaser.Scale.Events.RESIZE, this.handleResize, this);
    gameEvents.emit("scene:ready", { sceneKey: this.scene.key });
  }

  update() {
    this.inputController?.update();
  }

  private createPlaceholder() {
    this.label = this.add
      .text(this.scale.width / 2, this.scale.height / 2, "PHASER READY", {
        fontFamily: "Arial, Helvetica, sans-serif",
        fontSize: `${Math.max(18, Math.round(this.scale.width * 0.032))}px`,
        color: "#f7fbff"
      })
      .setOrigin(0.5);
  }

  private handleResize(gameSize: Phaser.Structs.Size) {
    this.cameras.main.setViewport(0, 0, gameSize.width, gameSize.height);
    this.label?.setPosition(gameSize.width / 2, gameSize.height / 2);
  }
}
