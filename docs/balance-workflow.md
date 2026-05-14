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

Examples:

```ts
const difficultyProgress = Phaser.Math.Clamp(score / difficultyScoreCap, 0, 1);
```

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
