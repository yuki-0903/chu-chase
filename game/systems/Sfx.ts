import { loadAudioSettings } from "@/game/systems/AudioSettings";

type OscillatorKind = OscillatorType;

let audioContext: AudioContext | null = null;

function getAudioContext() {
  if (typeof window === "undefined" || !loadAudioSettings().seEnabled) {
    return null;
  }

  const AudioContextConstructor =
    window.AudioContext ??
    (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

  if (!AudioContextConstructor) {
    return null;
  }

  audioContext ??= new AudioContextConstructor();
  void audioContext.resume().catch(() => undefined);
  return audioContext;
}

function createMasterGain(context: AudioContext, volume: number) {
  const gain = context.createGain();
  gain.gain.setValueAtTime(Math.max(0.0001, volume), context.currentTime);
  gain.connect(context.destination);
  return gain;
}

function playTone({
  attack = 0.01,
  duration,
  endFrequency,
  frequency,
  startOffset = 0,
  type = "sine",
  volume
}: {
  attack?: number;
  duration: number;
  endFrequency?: number;
  frequency: number;
  startOffset?: number;
  type?: OscillatorKind;
  volume: number;
}) {
  const context = getAudioContext();
  if (!context) {
    return;
  }

  const startAt = context.currentTime + startOffset;
  const oscillator = context.createOscillator();
  const gain = context.createGain();

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, startAt);
  if (endFrequency) {
    oscillator.frequency.exponentialRampToValueAtTime(endFrequency, startAt + duration);
  }

  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.exponentialRampToValueAtTime(volume, startAt + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
  oscillator.connect(gain).connect(context.destination);
  oscillator.start(startAt);
  oscillator.stop(startAt + duration + 0.03);
}

function playNoise({
  duration,
  highpass = 280,
  startOffset = 0,
  volume
}: {
  duration: number;
  highpass?: number;
  startOffset?: number;
  volume: number;
}) {
  const context = getAudioContext();
  if (!context) {
    return;
  }

  const sampleCount = Math.max(1, Math.floor(context.sampleRate * duration));
  const buffer = context.createBuffer(1, sampleCount, context.sampleRate);
  const channel = buffer.getChannelData(0);

  for (let index = 0; index < sampleCount; index += 1) {
    const fade = 1 - index / sampleCount;
    channel[index] = (Math.random() * 2 - 1) * fade;
  }

  const startAt = context.currentTime + startOffset;
  const source = context.createBufferSource();
  const filter = context.createBiquadFilter();
  const gain = createMasterGain(context, 0.0001);

  source.buffer = buffer;
  filter.type = "highpass";
  filter.frequency.setValueAtTime(highpass, startAt);
  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.exponentialRampToValueAtTime(volume, startAt + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
  source.connect(filter).connect(gain);
  source.start(startAt);
  source.stop(startAt + duration + 0.03);
}

export function playButtonClickSfx() {
  playTone({ duration: 0.11, endFrequency: 620, frequency: 360, type: "triangle", volume: 0.07 });
  playTone({ duration: 0.16, endFrequency: 980, frequency: 640, startOffset: 0.055, type: "sine", volume: 0.045 });
}

export const playReadyButtonSfx = playButtonClickSfx;

export function playRoomSuccessSfx() {
  playTone({ duration: 0.08, endFrequency: 580, frequency: 380, type: "triangle", volume: 0.045 });
  playTone({ duration: 0.12, endFrequency: 820, frequency: 560, startOffset: 0.06, type: "sine", volume: 0.04 });
  playTone({ duration: 0.1, endFrequency: 1080, frequency: 820, startOffset: 0.14, type: "sine", volume: 0.03 });
}

export function playOpponentReadySfx() {
  playTone({ duration: 0.1, endFrequency: 520, frequency: 470, type: "triangle", volume: 0.04 });
  playTone({ duration: 0.12, endFrequency: 720, frequency: 520, startOffset: 0.08, type: "sine", volume: 0.035 });
}

export function playRestartSfx() {
  playTone({ duration: 0.12, endFrequency: 360, frequency: 760, type: "triangle", volume: 0.055 });
  playNoise({ duration: 0.12, highpass: 620, startOffset: 0.02, volume: 0.026 });
}

export function playEscapeStartSfx() {
  playNoise({ duration: 0.24, highpass: 760, volume: 0.055 });
  playTone({ duration: 0.2, endFrequency: 960, frequency: 420, startOffset: 0.035, type: "sine", volume: 0.035 });
}

export function playChuserLockSfx() {
  playTone({ duration: 0.07, endFrequency: 150, frequency: 260, type: "square", volume: 0.035 });
  playTone({ duration: 0.09, endFrequency: 120, frequency: 180, startOffset: 0.075, type: "triangle", volume: 0.05 });
}

export function playChuserReleaseSfx() {
  playTone({ duration: 0.08, endFrequency: 720, frequency: 360, type: "triangle", volume: 0.052 });
  playNoise({ duration: 0.11, highpass: 860, startOffset: 0.02, volume: 0.035 });
  playTone({ duration: 0.16, endFrequency: 1120, frequency: 690, startOffset: 0.06, type: "sine", volume: 0.04 });
}

export function playKissCaptureSfx() {
  playTone({ duration: 0.18, endFrequency: 120, frequency: 96, type: "sawtooth", volume: 0.06 });
  playTone({ duration: 0.22, endFrequency: 420, frequency: 210, startOffset: 0.04, type: "triangle", volume: 0.075 });
  playNoise({ duration: 0.18, highpass: 420, startOffset: 0.02, volume: 0.04 });
  playTone({ duration: 0.12, endFrequency: 880, frequency: 520, startOffset: 0.14, type: "sine", volume: 0.04 });
}

export function playTimeWarningTickSfx() {
  playTone({ attack: 0.004, duration: 0.055, endFrequency: 620, frequency: 720, type: "square", volume: 0.025 });
}

export function playResultSfx(didWin: boolean) {
  if (didWin) {
    playTone({ duration: 0.14, endFrequency: 620, frequency: 420, type: "triangle", volume: 0.055 });
    playTone({ duration: 0.16, endFrequency: 880, frequency: 620, startOffset: 0.1, type: "sine", volume: 0.052 });
    playTone({ duration: 0.24, endFrequency: 1180, frequency: 880, startOffset: 0.22, type: "sine", volume: 0.04 });
    return;
  }

  playTone({ duration: 0.16, endFrequency: 190, frequency: 330, type: "triangle", volume: 0.052 });
  playTone({ duration: 0.22, endFrequency: 92, frequency: 180, startOffset: 0.11, type: "sawtooth", volume: 0.045 });
  playNoise({ duration: 0.16, highpass: 360, startOffset: 0.08, volume: 0.025 });
}

export function playFootstepSfx(runAmount: number) {
  const pitch = 210 + Math.random() * 70;
  const volume = 0.022 + runAmount * 0.024;

  playTone({
    attack: 0.004,
    duration: 0.07,
    endFrequency: pitch * 0.64,
    frequency: pitch,
    type: "triangle",
    volume
  });
}
