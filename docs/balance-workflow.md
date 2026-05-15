# Balance Workflow

Use this guide for gameplay tuning values.

## Core Rule

Do not scatter balance numbers throughout the codebase.

Create shared config files such as:

```txt
game/config/balance.ts
```

Examples of values that belong there:

- player speed
- object scale
- spawn interval
- spawn chance
- difficulty cap
- recovery amount
- score interval
- damage amount
- animation duration

## Why

During development, game feel changes constantly.

If numbers are scattered across scenes and managers, small tuning changes become slow and risky.

Centralized balance values make it easier to:

- tune with the user
- compare versions
- avoid accidental hidden difficulty changes
- document why a value exists

## Difficulty Curves

Prefer explicit caps.

Use local helper functions or `THREE.MathUtils` when useful.

This lets the game become harder over time without becoming impossible by accident.

For arcade games, avoid relying only on speed. Consider:

- spawn density
- object variety
- pattern complexity
- risk/reward item placement

## Tuning Workflow

1. Change one variable at a time.
2. Test locally.
3. Let the user confirm feel.
4. Commit only after approval.

Game feel is subjective. Small adjustments should be easy and reversible.

## Current CHU CHASE Values

Primary files:

```txt
shared/constants.ts
game/config/balance.ts
```

Current public-facing defaults:

- match duration: 60 seconds
- DODGER head start: 5 seconds
- captures to win: 1
- player speed: 4.8
- capture radius: 1.35
- arena radius: 12
- room code length: 5 numeric digits

Keep server-side rules in `shared/constants.ts` synchronized with client-side feel values in `game/config/balance.ts`.
