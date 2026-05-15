"use client";

import { useEffect } from "react";
import { playButtonClickSfx, unlockSfx } from "@/game/systems/Sfx";

export function ButtonSfx() {
  useEffect(() => {
    const playClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }

      const button = target.closest("button");
      if (
        !(button instanceof HTMLButtonElement) ||
        button.disabled ||
        button.getAttribute("aria-disabled") === "true"
      ) {
        return;
      }

      unlockSfx();
      playButtonClickSfx();
    };

    document.addEventListener("click", playClick);
    return () => document.removeEventListener("click", playClick);
  }, []);

  return null;
}
