"use client";

import { useState } from "react";
import { startBgm, stopBgm } from "@/game/systems/Bgm";
import { loadAudioSettings, saveAudioSettings, type AudioSettings } from "@/game/systems/AudioSettings";

export function AudioToggle() {
  const [settings, setSettings] = useState<AudioSettings>(() => loadAudioSettings());

  const updateSettings = (nextSettings: AudioSettings) => {
    saveAudioSettings(nextSettings);
    setSettings(nextSettings);
  };

  const toggleBgm = () => {
    const nextSettings = {
      ...settings,
      bgmEnabled: !settings.bgmEnabled
    };

    updateSettings(nextSettings);

    if (nextSettings.bgmEnabled) {
      startBgm();
    } else {
      stopBgm();
    }
  };

  const toggleSe = () => {
    updateSettings({
      ...settings,
      seEnabled: !settings.seEnabled
    });
  };

  return (
    <div className="audio-toggle" aria-label="Audio settings">
      <button
        type="button"
        className={`audio-toggle__button${settings.bgmEnabled ? " audio-toggle__button--on" : ""}`}
        aria-pressed={settings.bgmEnabled}
        onClick={toggleBgm}
      >
        BGM {settings.bgmEnabled ? "ON" : "OFF"}
      </button>
      <button
        type="button"
        className={`audio-toggle__button${settings.seEnabled ? " audio-toggle__button--on" : ""}`}
        aria-pressed={settings.seEnabled}
        onClick={toggleSe}
      >
        SE {settings.seEnabled ? "ON" : "OFF"}
      </button>
    </div>
  );
}
