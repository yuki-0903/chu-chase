# Audio Workflow

Use this guide for BGM and sound effects in browser games.

## Browser Audio Rule

Most browsers block audio until the user interacts with the page.

Recommended:

- do not start BGM automatically on page load
- start or unlock audio after a user gesture
- use the title/start button as the first audio trigger

Example flow:

1. User clicks START.
2. Play start SE immediately.
3. Start BGM after a short delay if needed.
4. Store BGM/SE settings in localStorage.

## Recommended Files

```txt
game/systems/AudioSettings.ts
public/assets/audio/
```

Suggested asset names:

```txt
bgm_main.mp3
se_start.mp3
se_hit.mp3
se_collect.mp3
se_confirm.mp3
```

## BGM / SE Settings

Most games should have separate settings:

- BGM on/off
- SE on/off

Keep the setting generic so UI can change later.

## Mixing Notes

- Start SE should be short and immediate.
- Avoid covering important gameplay sounds with loud BGM.
- Hit sounds should be rate-limited when collisions can happen repeatedly.
- Use short, readable SE for mobile speakers.
- Test with device volume low.

## Implementation Notes

Use `AudioSettings.ts` for persistent settings.

Current implementation uses browser audio helpers.

Relevant files:

```txt
game/systems/AudioSettings.ts
game/systems/Bgm.ts
game/systems/Sfx.ts
components/BgmPlayer.tsx
components/AudioToggle.tsx
components/ButtonSfx.tsx
```

Current behavior:

- BGM is preloaded, but not autoplayed.
- BGM starts after user intent such as join / ready / restart / BGM toggle.
- BGM does not start from `CREATE ROOM`.
- BGM and SE can be toggled from the bottom-right UI.
- Button clicks share one common SE.

When replacing audio assets, keep the load key stable when possible and change only the file path.
