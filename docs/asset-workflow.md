# Asset Workflow

Use this guide when generating or importing game assets.

## Directory Rules

Put runtime assets under:

```txt
public/assets/
  audio/
  images/
  sprites/
  ui/
```

Use clear, purpose-based names:

```txt
player_idle.png
button_start.png
enemy_drone_01.png
pickup_recovery_01.png
se_collect.mp3
```

Avoid vague names like:

```txt
image1.png
final.png
new_new.png
```

## Phaser Asset Paths

Do not hard-code `/assets/...`.

Use helpers in:

```txt
game/config/assets.ts
```

This keeps GitHub Pages paths working.

## AI Generated Image Issues

AI-generated transparent PNG assets often have:

- white edges
- jagged outlines
- uneven transparent padding
- glow cut off by the crop
- too much detail for small gameplay size

Before using generated assets:

1. Trim unnecessary transparent margins.
2. Keep the object centered.
3. Preserve glow.
4. Check for white or pale edge pixels.
5. Test the asset over the actual game background.
6. Check the asset at the size it appears in gameplay.

## White Edge / Jagged Edge Fixes

Options:

- regenerate with stronger transparent-background instructions
- crop and clean edges manually
- reduce pale edge alpha
- add matching glow behind the asset
- use a silhouette-friendly design
- avoid tiny high-detail objects

Important gameplay objects should be recognizable by silhouette, not detail.

## UI Images + Text

When placing Phaser text over UI images:

- scale the panel and text together
- use `screenScale`
- keep enough vertical padding
- test large numbers and long labels
- avoid text-only placeholder UI when image UI is required

Panel, text, and hit area should be laid out from the same measurements.

## Mobile Visibility

Assets that look good on desktop may be unreadable on mobile.

Check:

- small gameplay size
- dark background
- bright background
- motion
- glow visibility
- color separation from the environment

For important pickups or hazards, choose colors that contrast with the main background palette.
