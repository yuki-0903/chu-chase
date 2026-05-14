"use client";

import dynamic from "next/dynamic";

const PhaserGame = dynamic(
  async () => {
    const { PhaserGameClient } = await import("@/components/PhaserGameClient");
    return PhaserGameClient;
  },
  {
    ssr: false,
    loading: () => <div className="game-canvas" />
  }
);

export function PhaserCanvas() {
  return <PhaserGame />;
}
