# Asset Workflow

Use this guide when importing or replacing CHU CHASE assets.

## Runtime Asset Directories

```txt
public/assets/
  audio/
  images/
  models/
  ui/
```

Current important assets:

```txt
public/assets/audio/bg.mp3
public/assets/models/oni.glb
public/assets/models/runner.glb
public/assets/ui/chu.webp
public/assets/ui/dod.webp
```

## Asset Path Rules

Do not hard-code image/audio paths if a shared helper exists.

Use:

```txt
game/config/assets.ts
```

Current helpers:

```ts
ASSET_BASE
IMAGE_ASSET_BASE
AUDIO_ASSET_BASE
UI_ASSET_BASE
```

GLB paths are currently defined in `game/avatars/ChuAvatars.ts`.

## 3D Model Rules

Preferred export:

- `.glb`
- optimized for web
- reasonable triangle count
- texture resolution around 1024-2048 if needed
- no huge hidden meshes

After replacing models:

- test PC and iPhone loading
- check brightness and shadows
- check that CHUSER/DODGER face the correct movement direction
- check capture animation scale
- check ready intro drop/turn animation

## UI Image Rules

UI images should be:

- web-friendly
- transparent or clean background
- small enough for fast mobile load
- readable at the final displayed size

For logo character images:

- keep silhouette clear
- avoid white edge artifacts
- test over `--neu-bg`

## Audio Rules

See `audio-workflow.md`.

Keep BGM compressed enough for mobile. Current BGM is loaded from:

```txt
public/assets/audio/bg.mp3
```
