# CHU CHASE Game Algorithm

## Core Concept

CHU CHASE is a 1v1 online chase game.

- `CHUSER` chases and wins by catching once.
- `DODGER` escapes and wins by surviving until time runs out.
- The server is authoritative for movement, capture, and result judgment.

Internal code still uses these role keys:

```txt
tagger -> CHUSER
runner -> DODGER
```

## Basic Flow

1. Player A creates a room.
2. Player B joins with a 5-digit numeric room code.
3. When two players are present, roles are assigned automatically.
4. Both players enter the ready scene.
5. Each player presses `TAP READY`.
6. When both are ready, the match starts.
7. For the first 6.5 seconds, only DODGER can move.
8. After 6.5 seconds, CHUSER is released.
9. The match ends when CHUSER catches DODGER or time runs out.
10. Players can press `RESTART` for a rematch.

## Current Settings

Source of truth:

```txt
shared/constants.ts
game/config/balance.ts
```

Current values:

```ts
{
  roomCodeLength: 5,
  maxPlayersPerRoom: 2,
  serverTickRate: 30,
  matchDurationMs: 60_000,
  dodgerHeadStartMs: 6_500,
  capturesToWin: 1,
  captureRadius: 1.08,
  playerSpeed: 4.8,
  chuserSpeedMultiplier: 0.94,
  dodgerSpeedMultiplier: 1,
  playerRadius: 0.75,
  arenaRadius: 12,
  mapWidth: 24,
  mapHeight: 24,
  itemsEnabled: false
}
```

## Room Phases

```txt
waiting
ready
playing
ended
```

`countdown` exists in the protocol type, but the current implementation expresses the 5-second start phase inside `playing`.

## Server Responsibilities

The Socket.IO server:

- creates and joins rooms
- assigns roles
- receives input vectors
- applies 30fps movement updates
- clamps players inside the arena
- detects capture distance
- decides winner
- broadcasts snapshots and result events

The client:

- sends input direction
- renders snapshots
- plays local UI, camera, animation, BGM, and SE
- never decides the match winner

## Server Tick Flow

1. Iterate playing rooms.
2. For each player, read latest input.
3. If the player is CHUSER and the 5-second head start is active, force input to zero.
4. Update velocity and position.
5. Clamp position inside the arena.
6. Detect CHUSER/DODGER distance.
7. If distance is within `captureRadius`, emit `capture:happened`.
8. If capture count reaches `capturesToWin`, end with CHUSER win.
9. If time reaches zero, end with DODGER win.
10. Broadcast `state:snapshot`.

## Rematch

When the room is `ended` and a player sends `game:ready`:

- the room is prepared for rematch
- roles are assigned again
- both players must ready up again

## Future Extensions

- configurable match duration
- configurable captures required to win
- room settings screen
- items and item effects
- old room cleanup
- create/join rate limiting
- simple anti-abuse checks for public release
