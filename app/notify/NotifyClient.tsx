"use client";

import { useRef, useState } from "react";

export function NotifyClient() {
  const audioContextRef = useRef<AudioContext | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [message, setMessage] = useState("待機中");

  const enableSound = async () => {
    const context = new AudioContext();
    audioContextRef.current = context;
    await context.resume();
    playTone(context);
    setEnabled(true);
    setMessage("通知ON");
  };

  const testSound = () => {
    playTone(audioContextRef.current);
    setMessage("テスト再生");
  };

  return (
    <main className="notify-page">
      <section className="notify-card">
        <div className="notify-card__title">Codex Notify</div>
        <button type="button" onClick={enableSound} disabled={enabled}>
          {enabled ? "SOUND ON" : "ENABLE SOUND"}
        </button>
        <button type="button" onClick={testSound} disabled={!enabled}>
          TEST SOUND
        </button>
        <div className="notify-card__status">{message}</div>
      </section>
    </main>
  );
}

function playTone(context: AudioContext | null) {
  if (!context) {
    return;
  }

  const now = context.currentTime;
  const oscillator = context.createOscillator();
  const gain = context.createGain();

  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(880, now);
  oscillator.frequency.exponentialRampToValueAtTime(1320, now + 0.12);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.18, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);

  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(now);
  oscillator.stop(now + 0.3);
}
