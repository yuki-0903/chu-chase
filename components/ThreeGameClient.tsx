"use client";

import { useEffect, useRef } from "react";
import { createThreeGame, type ThreeGameHandle } from "@/game/createThreeGame";
import type {
  CaptureHappenedPayload,
  GameSnapshotPayload,
  GameStartPayload,
  PlayerId,
  PlayerInputPayload,
  PlayerRole,
  StageVariant
} from "@/shared/protocol";

interface ThreeGameClientProps {
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

export function ThreeGameClient({
  autoStart = false,
  capture,
  gameStart,
  mode = "local-prototype",
  onAssetsReady,
  onInput,
  readyIntroSignal = 0,
  selfPlayerId,
  selfRole,
  snapshot,
  stageVariant
}: ThreeGameClientProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<ThreeGameHandle | null>(null);
  const initialOptionsRef = useRef({
    autoStart,
    gameStart,
    mode,
    onAssetsReady,
    onInput,
    selfPlayerId,
    selfRole,
    stageVariant
  });

  useEffect(() => {
    if (!containerRef.current || gameRef.current) {
      return;
    }

    const initialOptions = initialOptionsRef.current;
    gameRef.current = createThreeGame(containerRef.current, {
      autoStart: initialOptions.autoStart,
      canStartLocally: initialOptions.mode === "local-prototype",
      gameStart: initialOptions.gameStart,
      onAssetsReady: initialOptions.onAssetsReady,
      onInput: initialOptions.onInput,
      selfPlayerId: initialOptions.selfPlayerId,
      selfRole: initialOptions.selfRole,
      stageVariant: initialOptions.stageVariant
    });

    return () => {
      gameRef.current?.destroy();
      gameRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (gameStart) {
      gameRef.current?.startOnlineMatch(gameStart, selfPlayerId, onInput);
    }
  }, [gameStart, onInput, selfPlayerId]);

  useEffect(() => {
    if (!gameStart) {
      gameRef.current?.setSelfRole(selfRole);
    }
  }, [gameStart, selfRole]);

  useEffect(() => {
    if (!gameStart && readyIntroSignal > 0) {
      gameRef.current?.startReadyIntro();
    }
  }, [gameStart, readyIntroSignal]);

  useEffect(() => {
    if (snapshot) {
      gameRef.current?.setSnapshot(snapshot, selfPlayerId);
    }
  }, [selfPlayerId, snapshot]);

  useEffect(() => {
    gameRef.current?.setStageVariant(stageVariant);
  }, [stageVariant]);

  useEffect(() => {
    if (capture) {
      gameRef.current?.playCapture(capture, selfPlayerId);
    }
  }, [capture, selfPlayerId]);

  return <div ref={containerRef} className="three-game-canvas" />;
}
