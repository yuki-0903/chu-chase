# Troubleshooting

Common problems found while building Phaser + Next.js browser games.

## Phaser Must Be Client Only

Phaser depends on browser APIs, so it should not run during SSR.

Use:

- a client component
- `next/dynamic`
- `ssr: false`
- dynamic `await import("phaser")` inside `createGame`

Recommended pattern:

```tsx
const PhaserGame = dynamic(
  async () => {
    const { PhaserGameClient } = await import("@/components/PhaserGameClient");
    return PhaserGameClient;
  },
  { ssr: false }
);
```

And inside game creation:

```ts
const PhaserRuntime = await import("phaser");
return new PhaserRuntime.Game(config);
```

Avoid importing Phaser into server components.

## Dev Server / .next Inconsistency

Sometimes Next.js dev/build can show errors like:

```txt
Cannot find module './819.js'
Cannot find module './682.js'
GET /_next/static/chunks/main-app.js 404
```

This usually means `.next` or the dev server has stale build output.

Recommended recovery:

1. Stop the dev server.
2. Start it again.
3. If still broken, delete `.next`.
4. Run `npm run dev` again.

```bash
rm -rf .next
npm run dev
```

Do not debug gameplay code first when the missing file is inside `.next`.

## GitHub Pages Deployment 404

If GitHub Actions deploy fails with:

```txt
Failed to create deployment (status: 404)
Ensure GitHub Pages has been enabled
```

Check repository settings:

1. Open GitHub repository settings.
2. Go to Pages.
3. Set Source to GitHub Actions.
4. Re-run the workflow.

The workflow alone is not enough if Pages is not enabled.

## Asset Path Problems

On GitHub Pages, hard-coded paths like this may fail:

```ts
"/assets/image.png"
```

Use the shared asset helpers:

```ts
import { IMAGE_ASSET_BASE } from "@/game/config/assets";

this.load.image("key", `${IMAGE_ASSET_BASE}/image.png`);
```

This keeps local development and GitHub Pages working with the same code.
