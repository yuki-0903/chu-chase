"use client";

import { useEffect } from "react";
import { preloadBgm } from "@/game/systems/Bgm";

export function BgmPlayer() {
  useEffect(() => {
    preloadBgm();
  }, []);

  return null;
}
