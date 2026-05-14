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

Use Phaser sound only after the game is running in the browser.

When replacing audio assets, keep the load key stable when possible and change only the file path.
