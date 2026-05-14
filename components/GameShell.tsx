import { PhaserCanvas } from "@/components/PhaserCanvas";

export function GameShell() {
  return (
    <main className="app-shell">
      <section className="game-frame" aria-label="Game">
        <PhaserCanvas />
      </section>
    </main>
  );
}
