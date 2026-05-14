import * as Phaser from "phaser";

export interface InputState {
  pointerDown: boolean;
  pointerX: number;
  pointerY: number;
  justPressed: boolean;
  justReleased: boolean;
  keys: {
    up: boolean;
    down: boolean;
    left: boolean;
    right: boolean;
    space: boolean;
  };
}

export class InputController {
  public readonly state: InputState = {
    pointerDown: false,
    pointerX: 0,
    pointerY: 0,
    justPressed: false,
    justReleased: false,
    keys: {
      up: false,
      down: false,
      left: false,
      right: false,
      space: false
    }
  };

  private readonly cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private readonly spaceKey?: Phaser.Input.Keyboard.Key;
  private readonly handlePointerDown = (pointer: Phaser.Input.Pointer) => {
    this.state.pointerDown = true;
    this.state.justPressed = true;
    this.setPointer(pointer);
  };
  private readonly handlePointerMove = (pointer: Phaser.Input.Pointer) => {
    this.setPointer(pointer);
  };
  private readonly handlePointerUp = (pointer: Phaser.Input.Pointer) => {
    this.state.pointerDown = false;
    this.state.justReleased = true;
    this.setPointer(pointer);
  };

  constructor(private readonly scene: Phaser.Scene) {
    this.cursors = scene.input.keyboard?.createCursorKeys();
    this.spaceKey = scene.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    scene.input.on("pointerdown", this.handlePointerDown);
    scene.input.on("pointermove", this.handlePointerMove);
    scene.input.on("pointerup", this.handlePointerUp);
    scene.input.on("pointerupoutside", this.handlePointerUp);
  }

  update() {
    this.state.keys.up = Boolean(this.cursors?.up?.isDown);
    this.state.keys.down = Boolean(this.cursors?.down?.isDown);
    this.state.keys.left = Boolean(this.cursors?.left?.isDown);
    this.state.keys.right = Boolean(this.cursors?.right?.isDown);
    this.state.keys.space = Boolean(this.spaceKey?.isDown);

    this.scene.events.once(Phaser.Scenes.Events.POST_UPDATE, () => {
      this.state.justPressed = false;
      this.state.justReleased = false;
    });
  }

  destroy() {
    this.scene.input.off("pointerdown", this.handlePointerDown);
    this.scene.input.off("pointermove", this.handlePointerMove);
    this.scene.input.off("pointerup", this.handlePointerUp);
    this.scene.input.off("pointerupoutside", this.handlePointerUp);
  }

  private setPointer(pointer: Phaser.Input.Pointer) {
    const worldPoint = this.scene.cameras.main.getWorldPoint(pointer.x, pointer.y);
    this.state.pointerX = worldPoint.x;
    this.state.pointerY = worldPoint.y;
  }
}
