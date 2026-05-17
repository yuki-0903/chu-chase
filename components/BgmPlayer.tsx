"use client";

import { useEffect } from "react";
import { preloadSfx } from "@/game/systems/Sfx";
import { installBgmLifecycleGuards, preloadBgm } from "@/game/systems/Bgm";

export function BgmPlayer() {
  useEffect(() => {
    preloadBgm();
    preloadSfx();
    return installBgmLifecycleGuards();
  }, []);

  return null;
}
