export interface ThreeInputState {
  pointerDown: boolean;
  pointerX: number;
  pointerY: number;
  joystickActive: boolean;
  joystickX: number;
  joystickY: number;
  keys: {
    up: boolean;
    down: boolean;
    left: boolean;
    right: boolean;
    space: boolean;
  };
}

export class ThreeInputController {
  public readonly state: ThreeInputState = {
    pointerDown: false,
    pointerX: 0,
    pointerY: 0,
    joystickActive: false,
    joystickX: 0,
    joystickY: 0,
    keys: {
      up: false,
      down: false,
      left: false,
      right: false,
      space: false
    }
  };

  private readonly pressedKeys = new Set<string>();
  private readonly joystickElement?: HTMLElement | null;
  private readonly joystickKnob?: HTMLElement | null;
  private joystickPointerId?: number;
  private readonly handleKeyDown = (event: KeyboardEvent) => {
    this.pressedKeys.add(event.code);
    this.updateKeyState();
  };
  private readonly handleKeyUp = (event: KeyboardEvent) => {
    this.pressedKeys.delete(event.code);
    this.updateKeyState();
  };
  private readonly handlePointerDown = (event: PointerEvent) => {
    if (this.isJoystickEvent(event)) {
      return;
    }

    if (shouldUseFloatingJoystick()) {
      this.beginJoystick(event);
      return;
    }

    this.state.pointerDown = true;
    this.setPointer(event);
  };
  private readonly handlePointerMove = (event: PointerEvent) => {
    if (this.joystickPointerId === event.pointerId) {
      event.preventDefault();
      this.setJoystick(event);
      return;
    }

    if (this.isJoystickEvent(event)) {
      return;
    }

    this.setPointer(event);
  };
  private readonly handlePointerUp = (event: PointerEvent) => {
    if (this.joystickPointerId === event.pointerId) {
      this.endJoystick(event);
      return;
    }

    if (this.isJoystickEvent(event)) {
      return;
    }

    this.state.pointerDown = false;
    this.setPointer(event);
  };
  private readonly handleJoystickPointerDown = (event: PointerEvent) => {
    this.beginJoystick(event);
  };
  private readonly handleJoystickPointerMove = (event: PointerEvent) => {
    if (this.joystickPointerId !== event.pointerId) {
      return;
    }

    event.preventDefault();
    this.setJoystick(event);
  };
  private readonly handleJoystickPointerUp = (event: PointerEvent) => {
    if (this.joystickPointerId !== event.pointerId) {
      return;
    }

    this.endJoystick(event);
  };

  constructor(private readonly target: HTMLElement) {
    this.joystickElement = document.querySelector<HTMLElement>(".virtual-joystick");
    this.joystickKnob = document.querySelector<HTMLElement>(".virtual-joystick__knob");

    window.addEventListener("keydown", this.handleKeyDown);
    window.addEventListener("keyup", this.handleKeyUp);
    target.addEventListener("pointerdown", this.handlePointerDown);
    target.addEventListener("pointermove", this.handlePointerMove);
    target.addEventListener("pointerup", this.handlePointerUp);
    target.addEventListener("pointercancel", this.handlePointerUp);
    this.joystickElement?.addEventListener("pointerdown", this.handleJoystickPointerDown);
    this.joystickElement?.addEventListener("pointermove", this.handleJoystickPointerMove);
    this.joystickElement?.addEventListener("pointerup", this.handleJoystickPointerUp);
    this.joystickElement?.addEventListener("pointercancel", this.handleJoystickPointerUp);
  }

  destroy() {
    window.removeEventListener("keydown", this.handleKeyDown);
    window.removeEventListener("keyup", this.handleKeyUp);
    this.target.removeEventListener("pointerdown", this.handlePointerDown);
    this.target.removeEventListener("pointermove", this.handlePointerMove);
    this.target.removeEventListener("pointerup", this.handlePointerUp);
    this.target.removeEventListener("pointercancel", this.handlePointerUp);
    this.joystickElement?.removeEventListener("pointerdown", this.handleJoystickPointerDown);
    this.joystickElement?.removeEventListener("pointermove", this.handleJoystickPointerMove);
    this.joystickElement?.removeEventListener("pointerup", this.handleJoystickPointerUp);
    this.joystickElement?.removeEventListener("pointercancel", this.handleJoystickPointerUp);
  }

  private updateKeyState() {
    this.state.keys.up = this.pressedKeys.has("ArrowUp") || this.pressedKeys.has("KeyW");
    this.state.keys.down = this.pressedKeys.has("ArrowDown") || this.pressedKeys.has("KeyS");
    this.state.keys.left = this.pressedKeys.has("ArrowLeft") || this.pressedKeys.has("KeyA");
    this.state.keys.right = this.pressedKeys.has("ArrowRight") || this.pressedKeys.has("KeyD");
    this.state.keys.space = this.pressedKeys.has("Space");
  }

  private setPointer(event: PointerEvent) {
    const bounds = this.target.getBoundingClientRect();
    const localX = (event.clientX - bounds.left) / Math.max(1, bounds.width);
    const localY = (event.clientY - bounds.top) / Math.max(1, bounds.height);

    if (isForcedLandscapeView()) {
      const logicalX = 1 - localY;
      const logicalY = localX;
      this.state.pointerX = logicalX * 2 - 1;
      this.state.pointerY = -(logicalY * 2 - 1);
      return;
    }

    this.state.pointerX = localX * 2 - 1;
    this.state.pointerY = -(localY * 2 - 1);
  }

  private setJoystick(event: PointerEvent) {
    if (!this.joystickElement) {
      return;
    }

    const bounds = this.joystickElement.getBoundingClientRect();
    const radius = Math.max(1, Math.min(bounds.width, bounds.height) / 2);
    const localX = event.clientX - (bounds.left + bounds.width / 2);
    const localY = event.clientY - (bounds.top + bounds.height / 2);
    const length = Math.hypot(localX, localY);
    const clampedLength = Math.min(length, radius);
    const normalizedX = length > 0 ? localX / radius : 0;
    const normalizedY = length > 0 ? localY / radius : 0;
    const clampedX = length > 0 ? (localX / length) * clampedLength : 0;
    const clampedY = length > 0 ? (localY / length) * clampedLength : 0;

    this.state.joystickX = Math.max(-1, Math.min(1, normalizedX));
    this.state.joystickY = Math.max(-1, Math.min(1, normalizedY));
    this.updateJoystickKnob(clampedX, clampedY);
  }

  private beginJoystick(event: PointerEvent) {
    event.preventDefault();
    this.joystickPointerId = event.pointerId;
    this.target.setPointerCapture(event.pointerId);
    this.state.pointerDown = false;
    this.state.joystickActive = true;
    this.positionJoystick(event);
    this.setJoystick(event);
    this.joystickElement?.classList.add("is-active");
  }

  private endJoystick(event: PointerEvent) {
    event.preventDefault();
    if (this.target.hasPointerCapture(event.pointerId)) {
      this.target.releasePointerCapture(event.pointerId);
    }

    this.joystickPointerId = undefined;
    this.state.joystickActive = false;
    this.state.joystickX = 0;
    this.state.joystickY = 0;
    this.updateJoystickKnob(0, 0);
    this.joystickElement?.classList.remove("is-active");
  }

  private positionJoystick(event: PointerEvent) {
    if (!this.joystickElement) {
      return;
    }

    const bounds = this.target.getBoundingClientRect();
    this.joystickElement.style.setProperty("--joystick-left", `${event.clientX - bounds.left}px`);
    this.joystickElement.style.setProperty("--joystick-top", `${event.clientY - bounds.top}px`);
  }

  private updateJoystickKnob(x: number, y: number) {
    if (!this.joystickKnob) {
      return;
    }

    this.joystickKnob.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;
  }

  private isJoystickEvent(event: PointerEvent) {
    return this.joystickElement?.contains(event.target as Node) ?? false;
  }
}

export function isForcedLandscapeView() {
  if (typeof window === "undefined") {
    return false;
  }

  const isPortraitWindow = window.matchMedia("(orientation: portrait)").matches;
  const isTouchPrimary = window.matchMedia("(pointer: coarse)").matches;

  return isPortraitWindow && (isTouchPrimary || navigator.maxTouchPoints > 0);
}

function shouldUseFloatingJoystick() {
  if (typeof window === "undefined") {
    return false;
  }

  const isTouchPrimary = window.matchMedia("(pointer: coarse)").matches;
  return isTouchPrimary || navigator.maxTouchPoints > 0;
}
