# Mobile Landscape Workflow

Use this guide when building a landscape-first Phaser game that must also work on smartphones.

## Core Lesson

Avoid rotating the canvas with CSS for gameplay.

CSS such as:

```css
canvas {
  transform: rotate(90deg);
}
```

can make the visual canvas and Phaser input coordinates disagree. This often causes:

- tap effects appearing in the wrong place
- left/right input being reversed or offset
- collision or pointer logic feeling inconsistent
- mobile-only bugs that do not appear on desktop

## Recommended Direction

Keep the canvas itself unrotated.

Handle landscape gameplay layout inside Phaser:

- calculate the intended game width/height in Phaser
- configure the camera/viewport intentionally
- convert pointer coordinates through Phaser's camera world point
- keep CSS focused on sizing and centering the canvas

## CSS Rules

The template should keep CSS simple:

```css
.game-canvas {
  position: absolute;
  inset: 0;
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

Do not use CSS rotation as the first approach.

## Phaser Layout Flow

For landscape-first games:

1. Decide the game's logical orientation.
2. If the browser is landscape, use the window width as game width and window height as game height.
3. If the browser is portrait but the game is landscape-first, decide whether to:
   - show a rotate-device prompt, or
   - map the game layout to a landscape logical area inside Phaser.
4. Keep pointer input in Phaser world coordinates.
5. Test tap position, movement direction, and visual effects on mobile early.

## Pointer Coordinate Rule

Use Phaser's camera conversion:

```ts
const point = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
```

Avoid hand-written coordinate transforms unless absolutely necessary.

If custom camera rotation or viewport logic is used, validate:

- pointer down location
- pointer move direction
- hold/tap effects
- object collection
- UI button hit areas

## Testing Checklist

Before accepting a mobile landscape implementation:

- [ ] Desktop landscape works.
- [ ] Smartphone portrait holding mode is tested.
- [ ] Smartphone landscape holding mode is tested if supported.
- [ ] Canvas fills the intended screen area.
- [ ] Game rendering is not offset inside the canvas.
- [ ] Tap effect appears exactly where touched.
- [ ] Movement direction matches the touched side or gesture.
- [ ] UI hit areas align with visual buttons.
- [ ] No black bars unless intentionally designed.
- [ ] Console has no relevant errors.

## Debugging Checklist

When touch feels wrong, log both raw pointer values and game world values:

```ts
console.log({
  clientX: pointer.event instanceof PointerEvent ? pointer.event.clientX : undefined,
  clientY: pointer.event instanceof PointerEvent ? pointer.event.clientY : undefined,
  pointerX: pointer.x,
  pointerY: pointer.y,
  worldX: point.x,
  worldY: point.y
});
```

Compare:

- browser coordinates
- Phaser pointer coordinates
- camera world coordinates
- visual effect coordinates

Do this before adding more coordinate math.

## Avoid

- CSS `rotate(90deg)` for the gameplay canvas
- mixing browser `clientX/clientY` directly with Phaser world coordinates
- adding offset fixes without checking camera conversion first
- assuming desktop pointer behavior matches mobile behavior
- waiting until late development to test mobile input

## Recommended First Implementation

For a new game, start with:

- unrotated canvas
- `Phaser.Scale.RESIZE`
- full-window canvas
- camera viewport matching the canvas
- pointer input through `getWorldPoint`

Only add custom orientation behavior after the base input and rendering are correct.
