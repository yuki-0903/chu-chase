# CHU CHASE Game Algorithm

## Core Concept

CHU CHASE is a 1v1 online chase game.

One player creates a room, and the other player joins that room.
When both players are present, the game decides which player is the tagger and which player is the runner.

## Basic Flow

1. Player A creates a room.
2. Player B joins the room.
3. When two players are in the room, roles are assigned.
4. One player becomes the tagger.
5. One player becomes the runner.
6. The match starts.
7. The runner tries to escape until time runs out.
8. The tagger tries to catch the runner.
9. The match ends when either player satisfies their win condition.

## Roles

### Tagger

- Chases the runner.
- Wins by catching the runner.

### Runner

- Escapes from the tagger.
- Wins by surviving until time runs out.

## Initial Match Rules

- Match duration: 60 seconds.
- Captures required to win: 1.
- If the tagger catches the runner once, the tagger wins immediately.
- If the runner survives for 60 seconds, the runner wins.

## Match Phases

```txt
waiting
ready
countdown
playing
ended
```

### waiting

The room exists, but there are not enough players yet.

### ready

Two players are in the room and the match can start.

### countdown

Short pre-match countdown before gameplay starts.

### playing

The match is active.

### ended

The match has ended and the result is shown.

## Initial Win Conditions

```txt
tagger wins:
  captureCount >= capturesToWin

runner wins:
  remainingTime <= 0
```

For the first version:

```txt
capturesToWin = 1
matchDurationMs = 60_000
```

## Server Authority

The server should be authoritative for match results.

The client should:

- send player input
- receive snapshots
- render the latest state
- show local UI and effects

The server should:

- manage rooms
- assign roles
- update positions
- detect captures
- decide the winner
- broadcast snapshots and result events

## Room State

```txt
roomCode
phase
players
settings
startedAt
endsAt
captureCount
winnerRole
```

## Player State

```txt
playerId
nickname
role
position
velocity
connected
lastInput
```

## Server Tick Flow

1. Receive inputs from clients.
2. Update player velocity and position.
3. Clamp players inside the playable area.
4. Calculate distance between tagger and runner.
5. If distance is within capture radius, count as capture.
6. If capture count reaches the required amount, end match with tagger win.
7. If time runs out, end match with runner win.
8. Broadcast the latest game snapshot to both players.

## Initial Settings

```ts
{
  matchDurationMs: 60_000,
  capturesToWin: 1,
  captureRadius: 54,
  playerSpeed: 280,
  itemsEnabled: false
}
```

## Future Extensions

Later versions may add:

- configurable match duration
- configurable captures required to win
- items
- item spawn rules
- item effects
- different stage layouts
- different movement speeds
- rematch flow
- room settings screen

## Notes

- Do not hard-code values that are likely to be tuned later.
- Keep match settings in a shared config structure.
- Keep result judgment on the server.
- Keep client-side capture effects visual only.
