# Responsive Game Layout

Use this guide for the current Three.js / Next.js CHU CHASE layout.

## Goal

The game should fill the browser screen while preserving the intended game orientation:

- desktop wide screens
- smartphone portrait holding mode
- smartphone landscape holding mode
- Codex in-app browser
- Vercel production URL

## Current Rules

- The root app fills `100vw` x `100dvh`.
- The Three.js renderer fills the game frame.
- PC windows under or equal to 768px wide are blocked with `PC WINDOW TOO SMALL`.
- Smartphone portrait is allowed, but game screens are visually treated as landscape.
- Canvas itself is not rotated by CSS.

## Important Files

```txt
app/globals.css
components/GameShell.tsx
components/ThreeCanvas.tsx
components/ThreeGameClient.tsx
game/createThreeGame.ts
game/config/gameConfig.ts
game/systems/ThreeInputController.ts
```

## Three.js Render Flow

Normal landscape / desktop:

```txt
renderer.render(scene, camera)
```

Forced mobile landscape view:

```txt
scene -> WebGLRenderTarget -> rotated display quad
```

This keeps the visual display landscape without rotating the DOM canvas.

## DOM Overlay Rules

DOM overlays that appear during game screens must be handled explicitly in portrait mobile media queries.

Examples:

- timer
- ready role display
- start cue
- result card
- room panel
- audio toggle
- connection status

When adding a new overlay:

1. Add normal desktop positioning.
2. Add portrait coarse-pointer positioning.
3. Verify it does not overlap joystick or bottom controls.
4. Test on an actual phone.

## Text / Button Rules

- Do not use viewport-width-based font scaling alone.
- Keep button dimensions stable.
- Avoid text overflow inside buttons.
- Prefer short labels:
  - `TAP READY`
  - `READY!`
  - `WAITING...`
  - `RESTART`

## Resize Checklist

- [ ] Desktop wide screen looks correct.
- [ ] Desktop narrow screen shows unsupported message at <=768px.
- [ ] Smartphone portrait entry screen looks portrait.
- [ ] Smartphone portrait game screen looks landscape.
- [ ] Timer stays top center.
- [ ] Audio toggle stays bottom/right area without blocking play.
- [ ] Ready/restart controls keep bottom spacing.
- [ ] Joystick appears under the touch point.
- [ ] No important UI is clipped.
- [ ] Browser console has no relevant errors.
