"use client";

import { useEffect, useRef } from "react";
import type * as Phaser from "phaser";
import { createGame } from "@/game/createGame";

export function PhaserGameClient() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    if (!containerRef.current || gameRef.current) {
      return;
    }

    let didCancel = false;

    void createGame(containerRef.current).then((game) => {
      if (didCancel) {
        game.destroy(true);
        return;
      }

      gameRef.current = game;
    });

    return () => {
      didCancel = true;
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, []);

  return <div ref={containerRef} className="game-canvas" />;
}
