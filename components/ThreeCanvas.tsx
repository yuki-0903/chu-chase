"use client";

import dynamic from "next/dynamic";
import type {
  CaptureHappenedPayload,
  GameSnapshotPayload,
  GameStartPayload,
  PlayerId,
  PlayerInputPayload,
  PlayerRole,
  StageVariant
} from "@/shared/protocol";

const ThreeGame = dynamic(
  async () => {
    const { ThreeGameClient } = await import("@/components/ThreeGameClient");
    return ThreeGameClient;
  },
  {
    ssr: false,
    loading: () => <div className="three-game-canvas" />
  }
);

interface ThreeCanvasProps {
  autoStart?: boolean;
  capture?: CaptureHappenedPayload | null;
  gameStart?: GameStartPayload | null;
  mode?: "local-prototype" | "online-ready";
  onAssetsReady?: () => void;
  onInput?: (payload: PlayerInputPayload) => void;
  readyIntroSignal?: number;
  selfPlayerId?: PlayerId;
  selfRole?: PlayerRole;
  snapshot?: GameSnapshotPayload | null;
  stageVariant?: StageVariant;
}

export function ThreeCanvas({
  autoStart = false,
  capture,
  gameStart,
  mode = "local-prototype",
  onAssetsReady,
  onInput,
  readyIntroSignal,
  selfPlayerId,
  selfRole,
  snapshot,
  stageVariant
}: ThreeCanvasProps) {
  return (
    <ThreeGame
      autoStart={autoStart}
      capture={capture}
      gameStart={gameStart}
      mode={mode}
      onAssetsReady={onAssetsReady}
      onInput={onInput}
      readyIntroSignal={readyIntroSignal}
      selfPlayerId={selfPlayerId}
      selfRole={selfRole}
      snapshot={snapshot}
      stageVariant={stageVariant}
    />
  );
}
