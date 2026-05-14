export interface AudioSettings {
  bgmEnabled: boolean;
  seEnabled: boolean;
}

const STORAGE_KEY = "phaser-next-template-audio";
const DEFAULT_AUDIO_SETTINGS: AudioSettings = {
  bgmEnabled: true,
  seEnabled: true
};

export function loadAudioSettings(): AudioSettings {
  if (typeof window === "undefined") {
    return DEFAULT_AUDIO_SETTINGS;
  }

  const rawValue = window.localStorage.getItem(STORAGE_KEY);
  if (!rawValue) {
    return DEFAULT_AUDIO_SETTINGS;
  }

  try {
    return {
      ...DEFAULT_AUDIO_SETTINGS,
      ...(JSON.parse(rawValue) as Partial<AudioSettings>)
    };
  } catch {
    return DEFAULT_AUDIO_SETTINGS;
  }
}

export function saveAudioSettings(settings: AudioSettings) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}
