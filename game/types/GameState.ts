export type GamePhase = "boot" | "ready" | "playing" | "paused";

export interface BaseGameState {
  phase: GamePhase;
}
