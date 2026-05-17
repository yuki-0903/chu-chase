"use client";

import { type CSSProperties, useCallback, useEffect, useRef, useState } from "react";
import { AudioToggle } from "@/components/AudioToggle";
import { BgmPlayer } from "@/components/BgmPlayer";
import { ButtonSfx } from "@/components/ButtonSfx";
import { RoomPanel } from "@/components/RoomPanel";
import { ThreeCanvas } from "@/components/ThreeCanvas";
import { playResultSfx, playTimeWarningTickSfx } from "@/game/systems/Sfx";
import { MATCH_DURATION_MS, DODGER_HEAD_START_MS } from "@/shared/constants";
import type {
  CaptureHappenedPayload,
  GameEndedPayload,
  GameSnapshotPayload,
  GameStartPayload,
  PlayerInputPayload,
  PlayerRole,
  RoomJoinedPayload
} from "@/shared/protocol";

const ROLE_LABELS: Record<PlayerRole, string> = {
  tagger: "CHUSER",
  runner: "DODGER"
};

export function GameShell() {
  const [now, setNow] = useState(() => Date.now());
  const [room, setRoom] = useState<RoomJoinedPayload | null>(null);
  const [gameStart, setGameStart] = useState<GameStartPayload | null>(null);
  const [gameEnd, setGameEnd] = useState<GameEndedPayload | null>(null);
  const [capture, setCapture] = useState<CaptureHappenedPayload | null>(null);
  const [snapshot, setSnapshot] = useState<GameSnapshotPayload | null>(null);
  const [sendInput, setSendInput] = useState<((payload: PlayerInputPayload) => void) | null>(null);
  const [areGameAssetsReady, setAreGameAssetsReady] = useState(false);
  const [isReadyIntroComplete, setIsReadyIntroComplete] = useState(false);
  const [readyIntroSignal, setReadyIntroSignal] = useState(0);
  const readyIntroRoomKeyRef = useRef("");
  const lastWarningSecondRef = useRef<number | null>(null);
  const resultSfxKeyRef = useRef("");
  const handleRoomChange = useCallback((nextRoom: RoomJoinedPayload | null) => {
    setRoom(nextRoom);
    if (!nextRoom) {
      setGameStart(null);
      setGameEnd(null);
      setCapture(null);
      setSnapshot(null);
      setAreGameAssetsReady(false);
      setIsReadyIntroComplete(false);
      readyIntroRoomKeyRef.current = "";
      return;
    }

    if (nextRoom.phase === "ready") {
      const nextReadyIntroRoomKey = `${nextRoom.roomCode}:${nextRoom.playerId}:${nextRoom.round}:ready`;
      const isSameReadyIntroRoom = readyIntroRoomKeyRef.current === nextReadyIntroRoomKey;
      setGameStart(null);
      setGameEnd(null);
      setCapture(null);
      setSnapshot(null);
      if (!isSameReadyIntroRoom) {
        setIsReadyIntroComplete(false);
      }
    }
  }, []);
  const handleGameStart = useCallback((payload: GameStartPayload) => {
    setGameStart(payload);
    setGameEnd(null);
    setCapture(null);
  }, []);
  const handleCapture = useCallback((payload: CaptureHappenedPayload) => {
    setCapture(payload);
  }, []);
  const handleGameEnd = useCallback((payload: GameEndedPayload) => {
    readyIntroRoomKeyRef.current = "";
    setGameEnd(payload);
  }, []);
  const handleInputSenderChange = useCallback((nextSendInput: ((payload: PlayerInputPayload) => void) | null) => {
    setSendInput(() => nextSendInput);
  }, []);
  const handleSnapshot = useCallback((payload: GameSnapshotPayload) => {
    setSnapshot(payload);
  }, []);
  const handleAssetsReady = useCallback(() => {
    setAreGameAssetsReady(true);
  }, []);
  useEffect(() => {
    if (!room || room.phase !== "ready" || gameStart || !areGameAssetsReady) {
      setIsReadyIntroComplete(false);
      return;
    }

    const readyIntroRoomKey = `${room.roomCode}:${room.playerId}:${room.round}:ready`;
    if (readyIntroRoomKeyRef.current === readyIntroRoomKey) {
      return;
    }

    readyIntroRoomKeyRef.current = readyIntroRoomKey;
    setReadyIntroSignal((current) => current + 1);

    const timeoutId = window.setTimeout(() => {
      setIsReadyIntroComplete(true);
    }, 1740);

    return () => window.clearTimeout(timeoutId);
  }, [areGameAssetsReady, gameStart, room]);
  useEffect(() => {
    if (!gameStart || gameEnd) {
      lastWarningSecondRef.current = null;
      return;
    }

    const intervalId = window.setInterval(() => {
      setNow(Date.now());
    }, 160);

    return () => window.clearInterval(intervalId);
  }, [gameEnd, gameStart]);

  const isRoomReady = room?.phase === "ready";
  const isGameVisible = isRoomReady || Boolean(gameStart);
  const shouldShowGameLoadingCover = isGameVisible && !areGameAssetsReady;
  const shouldShowReadyIntroUi = isRoomReady && areGameAssetsReady && isReadyIntroComplete && !gameStart;
  const selfRole = room?.players.find((player) => player.id === room.playerId)?.role;
  const roleLabel = selfRole ? ROLE_LABELS[selfRole] : "READY";
  const headStartRemainingMs = gameStart
    ? Math.max(0, gameStart.startsAt + DODGER_HEAD_START_MS - now)
    : 0;
  const headStartRemainingSeconds = Math.ceil(headStartRemainingMs / 1000);
  const isHeadStart = Boolean(gameStart && !gameEnd && headStartRemainingMs > 0);
  const startCueCaption = selfRole === "runner" ? "ESCAPE!!" : "HOLD YOUR CHU...";
  const remainingMs = gameStart
    ? snapshot?.remainingMs ?? Math.max(0, gameStart.startsAt + MATCH_DURATION_MS - now)
    : 0;
  const remainingSeconds = Math.ceil(remainingMs / 1000);
  const didWin = Boolean(gameEnd?.winnerRole && selfRole === gameEnd.winnerRole);
  const resultTitle = gameEnd ? (didWin ? "YOU WIN!" : "YOU LOSE!") : "";
  const isTimeWarning = Boolean(gameStart && !gameEnd && remainingSeconds <= 10 && remainingSeconds > 0);
  const isFinalCountdown = Boolean(gameStart && !gameEnd && remainingSeconds <= 3 && remainingSeconds > 0);
  const taggerSnapshot = snapshot?.players.find((player) => player.role === "tagger");
  const runnerSnapshot = snapshot?.players.find((player) => player.role === "runner");
  const playerDistance =
    taggerSnapshot && runnerSnapshot
      ? Math.hypot(
        taggerSnapshot.position.x - runnerSnapshot.position.x,
        taggerSnapshot.position.y - runnerSnapshot.position.y
      )
      : Number.POSITIVE_INFINITY;
  const dangerDistance = (room?.settings.captureRadius ?? 1.35) + 2.25;
  const isDangerNear = Boolean(gameStart && !gameEnd && playerDistance < dangerDistance);
  const dangerLevel = isDangerNear ? Math.round((1 - playerDistance / dangerDistance) * 100) : 0;
  const elapsedSinceStart = gameStart ? now - gameStart.startsAt : 0;
  const shouldShowChuserReleaseCue = Boolean(
    gameStart &&
    !gameEnd &&
    selfRole === "tagger" &&
    elapsedSinceStart >= DODGER_HEAD_START_MS &&
    elapsedSinceStart <= DODGER_HEAD_START_MS + 1300
  );

  useEffect(() => {
    if (!gameStart || gameEnd || remainingSeconds <= 0 || remainingSeconds > 10) {
      return;
    }

    if (lastWarningSecondRef.current === remainingSeconds) {
      return;
    }

    lastWarningSecondRef.current = remainingSeconds;
    playTimeWarningTickSfx();
  }, [gameEnd, gameStart, remainingSeconds]);

  useEffect(() => {
    if (!gameEnd) {
      resultSfxKeyRef.current = "";
      return;
    }

    const resultSfxKey = `${gameEnd.roomCode}:${gameEnd.serverTime}:${gameEnd.reason}`;
    if (resultSfxKeyRef.current === resultSfxKey) {
      return;
    }

    resultSfxKeyRef.current = resultSfxKey;
    playResultSfx(didWin);
  }, [didWin, gameEnd]);

  return (
    <main className="app-shell">
      <BgmPlayer />
      <ButtonSfx />
      <AudioToggle />
      <div className="orientation-stage">
        <section className="game-frame" aria-label="CHU CHASE">
          {isGameVisible ? (
            <>
              <ThreeCanvas
                autoStart={Boolean(gameStart)}
                capture={capture}
                gameStart={gameStart}
                mode="online-ready"
                onAssetsReady={handleAssetsReady}
                onInput={sendInput ?? undefined}
                readyIntroSignal={readyIntroSignal}
                selfPlayerId={room?.playerId}
                selfRole={selfRole}
                snapshot={snapshot}
              />
              <div className="game-hud" aria-hidden="true">
                {gameStart && !gameEnd ? (
                  <div
                    className={[
                      "game-timer",
                      isTimeWarning ? "game-timer--warning" : "",
                      isFinalCountdown ? "game-timer--final" : ""
                    ].filter(Boolean).join(" ")}
                  >
                    TIME {remainingSeconds}
                  </div>
                ) : null}
              </div>
              {isDangerNear ? (
                <div className="danger-cue" style={{ "--danger-level": `${dangerLevel}%` } as CSSProperties}>
                  <div className="danger-cue__text">DANGER</div>
                </div>
              ) : null}
              {capture && !gameEnd ? <div className="kiss-flash" aria-hidden="true" /> : null}
              {shouldShowChuserReleaseCue ? (
                <div className="release-cue" aria-live="polite">
                  GO CHU!!
                </div>
              ) : null}
              {shouldShowReadyIntroUi ? (
                <div className="ready-card" aria-live="polite">
                  <div className="ready-card__label">YOUR ROLE</div>
                  <div className={`ready-card__role ready-card__role--${selfRole ?? "unknown"}`}>
                    {roleLabel}
                  </div>
                </div>
              ) : null}
              {isHeadStart ? (
                <div className={`start-cue start-cue--${selfRole ?? "unknown"}`} aria-live="polite">
                  <div key={headStartRemainingSeconds} className="start-cue__count">
                    {headStartRemainingSeconds}
                  </div>
                  <div className="start-cue__caption">{startCueCaption}</div>
                </div>
              ) : null}
              {capture && !gameEnd ? (
                <div className="impact-card" aria-live="polite">
                  <div className="impact-card__text">＼\ BUCHUUU /／</div>
                </div>
              ) : null}
              {gameEnd ? (
                <div
                  className={`result-card${didWin ? " result-card--win" : " result-card--lose"}`}
                  aria-live="polite"
                >
                  <div className={`result-card__title${didWin ? " result-card__title--win" : ""}`}>
                    {resultTitle}
                  </div>
                </div>
              ) : null}
              <div className="virtual-joystick" aria-label="Move joystick">
                <div className="virtual-joystick__knob" />
              </div>
              {shouldShowGameLoadingCover ? (
                <div className="game-loading-overlay game-loading-overlay--app">LOADING</div>
              ) : null}
            </>
          ) : (
            <div className="room-wait-screen" aria-hidden="true">
              <div className="room-wait-screen__logo">
                <div className="room-wait-screen__logo-badges">
                  <img src="/assets/ui/dod.webp" alt="" className="room-wait-screen__logo-avatar" />
                  <img
                    src="/assets/ui/chu.webp"
                    alt=""
                    className="room-wait-screen__logo-avatar room-wait-screen__logo-avatar--chu"
                  />
                </div>
                <div className="room-wait-screen__logo-text">
                  <span>CHU</span>
                  <span>CHASE</span>
                </div>
              </div>
            </div>
          )}

          <RoomPanel
            onCapture={handleCapture}
            onGameEnd={handleGameEnd}
            onGameStart={handleGameStart}
            onInputSenderChange={handleInputSenderChange}
            onRoomChange={handleRoomChange}
            onSnapshot={handleSnapshot}
            showReadyControls={shouldShowReadyIntroUi}
          />

          <div className="unsupported-screen" role="status">
            <div className="unsupported-screen__title">PC WINDOW TOO SMALL</div>
            <div className="unsupported-screen__body">横幅768pxより広い画面でプレイしてください</div>
          </div>
        </section>
      </div>
    </main>
  );
}
