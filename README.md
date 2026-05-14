# Phaser Next Template

A minimal Next.js App Router + TypeScript + Phaser 3 template for browser games.

This template intentionally avoids genre-specific systems such as score, HP, enemies,
items, ranking, login, or monetization. It only provides the shared foundation that
most Phaser browser games need.

## Included

- Next.js App Router
- TypeScript
- Phaser 3 loaded on the client only
- Dynamic import with SSR disabled for the Phaser canvas
- React shell separated from the Phaser game instance
- Minimal Phaser scenes: `BootScene`, `PreloadScene`, `MainScene`
- Shared asset path helpers for GitHub Pages `basePath`
- Shared typed event bus
- Generic input state collector for pointer and keyboard
- Audio settings storage helpers
- Full-screen responsive canvas CSS
- GitHub Pages workflow for static export

## Not Included

- Score
- HP
- Enemies
- Items
- Game over flow
- Ranking
- Login
- Payments
- Genre-specific managers
- CSS rotation for mobile layout

Add those per game after the concept is decided.

## Directory

```txt
app/
  layout.tsx
  page.tsx
  globals.css
components/
  GameShell.tsx
  PhaserCanvas.tsx
  PhaserGameClient.tsx
game/
  createGame.ts
  config/
    assets.ts
    balance.ts
    gameConfig.ts
  scenes/
    BootScene.ts
    PreloadScene.ts
    MainScene.ts
  systems/
    AudioSettings.ts
    GameEvents.ts
    InputController.ts
  types/
    GameState.ts
public/
  assets/
    audio/
    images/
    ui/
```

## Start

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## GitHub Pages

1. Create a GitHub repository.
2. Push this project to `main`.
3. In GitHub repository settings, enable Pages with GitHub Actions.
4. Push to `main` again or run the workflow manually.

The workflow sets:

```bash
NEXT_PUBLIC_BASE_PATH=/${{ github.event.repository.name }}
```

Asset paths should use `game/config/assets.ts` instead of hard-coded `/assets/...`.

## Codex Workflow

Recommended workflow for future games is documented in:

```txt
docs/codex-workflow.md
```

Short version:

- Create one GitHub Issue per feature or bug.
- Use branch names like `feature/#12`.
- Work locally first.
- Let the user confirm in the browser before pushing.
- Do not add unrequested game specs.
- Keep reusable systems generic until the game concept is clear.
- After completion, comment the issue with a short summary and close it.

## Mobile Landscape Workflow

For landscape-first games, read this before implementing mobile support:

```txt
docs/mobile-landscape-workflow.md
```

Key rule:

- Do not rotate the gameplay canvas with CSS as the first approach.
- Keep the canvas unrotated and handle orientation/layout intentionally in Phaser.
- Validate mobile tap coordinates early.

## Responsive Layout

All games should fill the available browser screen and adapt object/UI scale to the current viewport.

```txt
docs/responsive-game-layout.md
```

Key rule:

- The canvas fills the browser.
- Phaser handles object scale, UI layout, world bounds, and camera layout.
- Game elements should use screen-relative positions and shared scale values.
- Avoid fixed-size layouts that only look good at one resolution.

## Common Workflows

These docs capture issues that tend to appear in most Phaser browser games:

```txt
docs/troubleshooting.md
docs/audio-workflow.md
docs/asset-workflow.md
docs/balance-workflow.md
```

They cover:

- Phaser client-only loading in Next.js
- `.next` / dev server cache issues
- browser audio restrictions
- generated asset cleanup
- UI image and text alignment
- shared balance config
- GitHub Pages setup problems

## Asset Guidelines

- Put runtime assets in `public/assets`.
- Keep generated images tightly cropped.
- Prefer transparent PNGs for sprites and UI.
- Keep gameplay-critical objects readable at mobile size.
- Avoid relying on CSS transforms for gameplay coordinate systems.
