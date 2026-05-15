import { AUDIO_ASSET_BASE } from "@/game/config/assets";
import { loadAudioSettings } from "@/game/systems/AudioSettings";

const BGM_URL = `${AUDIO_ASSET_BASE}/bg.mp3`;
const BGM_VOLUME = 0.34;

let bgmAudio: HTMLAudioElement | null = null;

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
