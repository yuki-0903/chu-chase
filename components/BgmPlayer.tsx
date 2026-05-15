"use client";

import { useEffect } from "react";
import { preloadSfx } from "@/game/systems/Sfx";
import { preloadBgm } from "@/game/systems/Bgm";

export function BgmPlayer() {
  useEffect(() => {
    preloadBgm();
    preloadSfx();
  }, []);

  return null;
}
