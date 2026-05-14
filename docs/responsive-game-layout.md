# Responsive Game Layout

Use this guide for all browser games made from this template.

## Goal

The game should fill the available browser screen on every device:

- desktop
- laptop
- tablet
- smartphone
- in-app browser
- GitHub Pages browser view

The game should not rely on one fixed canvas size. Game objects, UI, effects, and interaction areas should adapt to the visible screen size.

## Core Rule

The canvas fills the browser. The game layout adapts inside Phaser.

CSS is responsible for:

- filling the viewport
- preventing scroll
- keeping the canvas attached to the screen

Phaser is responsible for:

- scaling game objects
- positioning UI
- camera layout
- world bounds
- input coordinate handling

## CSS Baseline

Keep the page and canvas full-screen:

```css
html,
body {
  width: 100%;
  min-height: 100%;
  margin: 0;
  overflow: hidden;
}

.app-shell {
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100dvh;
}

.game-frame,
.game-canvas {
  width: 100%;
  height: 100%;
}

.game-canvas canvas {
  display: block;
  width: 100%;
  height: 100%;
  touch-action: none;
}
```

Avoid scroll-based layouts for the game screen.

## Phaser Scale Baseline

Use resize mode:

```ts
scale: {
  mode: Phaser.Scale.RESIZE,
  autoCenter: Phaser.Scale.CENTER_BOTH
}
```

On resize, update:

- camera viewport
- world bounds
- background size
- UI positions
- object scale
- input hit areas

## Screen Scale Pattern

Use a shared scale value derived from the current screen size:

```ts
const BASE_GAME_WIDTH = 960;
const BASE_GAME_HEIGHT = 540;

const screenScale = Phaser.Math.Clamp(
  Math.min(gameWidth / BASE_GAME_WIDTH, gameHeight / BASE_GAME_HEIGHT),
  0.62,
  1.45
);
```

Use this for:

- player size
- enemy size
- UI size
- margins
- particle size
- movement speed when appropriate

Do not hard-code object sizes only for one screen width.

## Positioning Pattern

Position important elements relative to the screen:

```ts
const centerX = gameWidth / 2;
const centerY = gameHeight / 2;
const margin = 28 * screenScale;
const bottomY = gameHeight - 72 * screenScale;
```

Prefer ratios and scaled margins:

- `gameWidth / 2`
- `gameHeight * 0.65`
- `24 * screenScale`
- `Math.min(width * 0.4, 380 * screenScale)`

Avoid magic coordinates that only work at one resolution.

## UI Rules

UI should stay readable and aligned at every screen size.

- Use `scrollFactor(0)` for fixed HUD elements.
- Recompute UI layout on resize.
- Keep text inside image panels.
- Use responsive font sizes based on `screenScale`, not viewport width alone.
- Use stable dimensions for buttons and panels.
- Test long labels and large numbers.

## Visual Consistency

The game should feel like the same game at all screen sizes.

This means:

- objects scale proportionally
- spacing feels intentional
- HUD does not overlap gameplay
- important elements stay visible
- backgrounds cover the full screen
- no accidental black bars
- no UI drifting outside panels

## Resize Checklist

Before accepting a layout:

- [ ] Desktop wide screen looks correct.
- [ ] Desktop narrow screen looks correct.
- [ ] Smartphone portrait looks correct.
- [ ] Smartphone landscape looks correct when supported.
- [ ] Canvas fills the visible browser area.
- [ ] Background fills the canvas.
- [ ] Main objects scale with screen size.
- [ ] UI scales with screen size.
- [ ] Text does not overflow panels/buttons.
- [ ] Tap/click hit areas match visuals.
- [ ] No important gameplay object spawns outside the visible area.
- [ ] Console has no relevant errors after resize.

## Implementation Notes

Create helper getters in scenes when useful:

```ts
private get gameWidth() {
  return this.scale.width;
}

private get gameHeight() {
  return this.scale.height;
}

private get screenScale() {
  return Phaser.Math.Clamp(
    Math.min(this.gameWidth / BASE_GAME_WIDTH, this.gameHeight / BASE_GAME_HEIGHT),
    0.62,
    1.45
  );
}
```

Then use these helpers everywhere layout is calculated.

## Avoid

- fixed-size-only layouts
- placing UI with unscaled magic numbers
- assuming `960x540` or `1920x1080`
- letting CSS scale the canvas while Phaser logic uses stale dimensions
- updating visuals on resize but forgetting physics bounds
- testing only one browser size

## Recommended First Step For New Games

Before adding game-specific systems, confirm:

1. The blank Phaser scene fills the whole browser.
2. A centered placeholder remains centered while resizing.
3. A corner placeholder stays inside the safe margin while resizing.
4. Pointer coordinates match the visual location.

Only then add gameplay objects.
