import { AUDIO_ASSET_BASE } from "@/game/config/assets";
import { loadAudioSettings } from "@/game/systems/AudioSettings";

const BGM_URL = `${AUDIO_ASSET_BASE}/bg.mp3`;
const BGM_VOLUME = 0.34;

let bgmAudio: HTMLAudioElement | null = null;
let bgmLifecycleCleanup: (() => void) | null = null;

function getBgmAudio() {
  if (typeof window === "undefined") {
    return null;
  }

  bgmAudio ??= createBgmAudio();
  return bgmAudio;
}

function createBgmAudio() {
  const audio = new Audio(BGM_URL);
  audio.loop = true;
  audio.preload = "auto";
  audio.volume = BGM_VOLUME;
  return audio;
}

export function preloadBgm() {
  getBgmAudio()?.load();
}

export function startBgm() {
  if (!loadAudioSettings().bgmEnabled) {
    return;
  }

  const audio = getBgmAudio();
  if (!audio || !audio.paused) {
    return;
  }

  void audio.play().catch(() => undefined);
}

export function stopBgm() {
  bgmAudio?.pause();
}

export function disposeBgm() {
  if (!bgmAudio) {
    return;
  }

  bgmAudio.pause();
  bgmAudio.removeAttribute("src");
  bgmAudio.load();
  bgmAudio = null;
}

export function installBgmLifecycleGuards() {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  if (bgmLifecycleCleanup) {
    return bgmLifecycleCleanup;
  }

  const stopWhenHidden = () => {
    if (document.visibilityState === "hidden") {
      stopBgm();
    }
  };

  const disposeWhenLeaving = () => {
    disposeBgm();
  };

  document.addEventListener("visibilitychange", stopWhenHidden);
  window.addEventListener("pagehide", disposeWhenLeaving);
  window.addEventListener("beforeunload", disposeWhenLeaving);

  bgmLifecycleCleanup = () => {
    document.removeEventListener("visibilitychange", stopWhenHidden);
    window.removeEventListener("pagehide", disposeWhenLeaving);
    window.removeEventListener("beforeunload", disposeWhenLeaving);
    stopBgm();
    bgmLifecycleCleanup = null;
  };

  return bgmLifecycleCleanup;
}
