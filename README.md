# CHU CHASE 3D Template

A CHU CHASE-ready 3D browser game template built with Next.js, TypeScript, and Three.js.

The project art direction is documented in:

```txt
docs/art-direction.md
```

Do not implement concrete game content until the game specification is provided.

## Included

- Next.js App Router
- TypeScript
- Three.js rendered on the client only
- Dynamic import with SSR disabled for the 3D canvas
- React shell separated from the Three.js game instance
- Full-screen responsive WebGL canvas
- Keyboard and pointer input foundation
- Typed game event bus
- Audio settings storage helpers
- GitHub Pages static export settings
- Socket.IO server/protocol foundation for future multiplayer work
- Minimal placeholder 3D scene for renderer, camera, lights, resize, input, and disposal checks

## Directory

```txt
app/
  layout.tsx
  page.tsx
  globals.css
components/
  GameShell.tsx
  ThreeCanvas.tsx
  ThreeGameClient.tsx
game/
  createThreeGame.ts
  config/
    assets.ts
    balance.ts
    gameConfig.ts
    network.ts
  systems/
    AudioSettings.ts
    GameEvents.ts
    ThreeInputController.ts
  types/
    GameState.ts
server/
  index.ts
shared/
  constants.ts
  math.ts
  protocol.ts
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

## Multiplayer Server

The Socket.IO server foundation can be run separately:

```bash
npm run dev:server
```

Default server URL:

```txt
http://localhost:3001
```

Client connection settings live in:

```txt
game/config/network.ts
```

## GitHub Pages

The Next.js config is prepared for static export.

When deploying to GitHub Pages, set:

```bash
NEXT_PUBLIC_BASE_PATH=/${{ github.event.repository.name }}
```

Runtime asset paths should use `game/config/assets.ts` instead of hard-coded `/assets/...`.

## Workflow Docs

```txt
docs/codex-workflow.md
docs/art-direction.md
docs/responsive-game-layout.md
docs/mobile-landscape-workflow.md
docs/troubleshooting.md
docs/audio-workflow.md
docs/asset-workflow.md
docs/balance-workflow.md
```

Some older workflow notes may still mention Phaser from the original template. Use the current source as the authority for runtime architecture: this project now uses Three.js for 3D rendering.
