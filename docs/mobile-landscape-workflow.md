# Mobile Landscape Workflow

CHU CHASE is a landscape-first Three.js game that must also work when a phone is held vertically.

## Core Rule

Do not rotate the gameplay canvas with CSS.

Avoid:

```css
canvas {
  transform: rotate(90deg);
}
```

CSS canvas rotation can make visual coordinates and input coordinates disagree.

## Current Direction

The canvas stays unrotated.

For smartphone portrait holding mode:

- render the Three.js scene into an offscreen render target
- draw that render target through a rotated display quad
- keep pointer and joystick logic in the game's own coordinate conversion layer
- rotate DOM overlays separately only when needed

Relevant files:

```txt
game/createThreeGame.ts
game/systems/ThreeInputController.ts
app/globals.css
```

## UI Orientation

Entry screens:

- room create / join uses smartphone portrait orientation
- numeric room keypad avoids opening the OS keyboard

Game screens:

- ready / playing / result are treated as landscape game screens
- mobile portrait holding mode visually appears landscape
- joystick appears where the player taps

## Input Rules

- Do not rely on CSS-transformed canvas coordinates.
- Convert touch/pointer movement in `ThreeInputController`.
- Test joystick direction on real phones after any orientation changes.

## Test Checklist

- [ ] Smartphone portrait: entry screen is readable.
- [ ] Smartphone portrait: room code keypad appears in the intended landscape-relative side.
- [ ] Smartphone portrait: game scene fills the screen.
- [ ] Smartphone portrait: joystick appears where tapped.
- [ ] Smartphone portrait: joystick up moves up, left moves left.
- [ ] Smartphone landscape: joystick still works.
- [ ] PC: window width 768px or less shows unsupported screen.
- [ ] No canvas/input offset after resize.
