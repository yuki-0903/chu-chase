"use client";

import { type ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { getSocketServerUrl, SOCKET_PATH } from "@/game/config/network";
import { startBgm } from "@/game/systems/Bgm";
import {
  playOpponentReadySfx,
  playRoomSuccessSfx
} from "@/game/systems/Sfx";
import type {
  ClientToServerEvents,
  CaptureHappenedPayload,
  GameEndedPayload,
  GameStartPayload,
  GameSnapshotPayload,
  PlayerInputPayload,
  RoomJoinedPayload,
  ServerErrorPayload,
  ServerToClientEvents
} from "@/shared/protocol";

type ClientSocket = Socket<ServerToClientEvents, ClientToServerEvents>;
type ConnectionState = "connecting" | "connected" | "disconnected";
type RoomLeaveResponse = { ok: true } | ServerErrorPayload;

function isServerError(payload: RoomJoinedPayload | ServerErrorPayload): payload is ServerErrorPayload {
  return "code" in payload;
}

function normalizeRoomCodeDraft(value: string) {
  return value.replace(/\D/g, "").slice(0, 5);
}

function isLeaveError(payload: RoomLeaveResponse): payload is ServerErrorPayload {
  return "code" in payload;
}

interface RoomPanelProps {
  onInputSenderChange: (sendInput: ((payload: PlayerInputPayload) => void) | null) => void;
  onRoomChange: (room: RoomJoinedPayload | null) => void;
  onGameStart: (payload: GameStartPayload) => void;
  onCapture: (payload: CaptureHappenedPayload) => void;
  onGameEnd: (payload: GameEndedPayload) => void;
  onSnapshot: (payload: GameSnapshotPayload) => void;
  showReadyControls?: boolean;
}

export function RoomPanel({
  onCapture,
  onGameEnd,
  onGameStart,
  onInputSenderChange,
  onRoomChange,
  onSnapshot,
  showReadyControls = true
}: RoomPanelProps) {
  const socketRef = useRef<ClientSocket | null>(null);
  const readyPlayerCountRef = useRef(0);
  const [connectionState, setConnectionState] = useState<ConnectionState>("connecting");
  const [roomCodeInput, setRoomCodeInput] = useState("");
  const [room, setRoom] = useState<RoomJoinedPayload | null>(null);
  const [error, setError] = useState("");
  const [hasGameStarted, setHasGameStarted] = useState(false);
  const [hasGameEnded, setHasGameEnded] = useState(false);
  const [usesTouchNumberPad, setUsesTouchNumberPad] = useState(false);
  const [isNumberPadOpen, setIsNumberPadOpen] = useState(false);
  const [buttonPopKey, setButtonPopKey] = useState(0);
  const socketUrl = useMemo(() => getSocketServerUrl(), []);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(pointer: coarse)");
    const updateUsesTouchNumberPad = () => {
      setUsesTouchNumberPad(mediaQuery.matches || navigator.maxTouchPoints > 0);
    };

    updateUsesTouchNumberPad();
    mediaQuery.addEventListener("change", updateUsesTouchNumberPad);

    return () => {
      mediaQuery.removeEventListener("change", updateUsesTouchNumberPad);
    };
  }, []);

  useEffect(() => {
    const socket: ClientSocket = io(socketUrl, {
      path: SOCKET_PATH
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      setConnectionState("connected");
      onInputSenderChange((payload) => {
        socket.emit("input:update", payload);
      });
      setError("");
    });
    socket.on("disconnect", () => {
      setConnectionState("disconnected");
      onInputSenderChange(null);
    });
    socket.on("connect_error", () => {
      setConnectionState("disconnected");
      setError("Socket serverに接続できません");
    });
    socket.on("room:created", (payload) => {
      playRoomSuccessSfx();
      setRoom(payload);
      onRoomChange(payload);
      setRoomCodeInput(payload.roomCode);
      setIsNumberPadOpen(false);
      setHasGameEnded(false);
      setError("");
    });
    socket.on("room:joined", (payload) => {
      playRoomSuccessSfx();
      setRoom(payload);
      onRoomChange(payload);
      setRoomCodeInput(payload.roomCode);
      setIsNumberPadOpen(false);
      setHasGameEnded(false);
      setError("");
    });
    socket.on("room:waiting", (payload) => {
      const readyPlayerCount = payload.players.filter((player) => player.ready).length;
      if (payload.phase === "ready" && readyPlayerCount > readyPlayerCountRef.current) {
        playOpponentReadySfx();
      }
      readyPlayerCountRef.current = readyPlayerCount;
      setRoom(payload);
      onRoomChange(payload);
      setRoomCodeInput(payload.roomCode);
      if (payload.phase === "ready") {
        setHasGameEnded(false);
        setHasGameStarted(false);
      }
    });
    socket.on("server:error", (payload) => {
      setError(payload.message);
    });
    socket.on("game:start", (payload) => {
      setHasGameStarted(true);
      setHasGameEnded(false);
      onGameStart(payload);
    });
    socket.on("capture:happened", (payload) => {
      onCapture(payload);
    });
    socket.on("game:ended", (payload) => {
      setHasGameStarted(false);
      setHasGameEnded(true);
      onGameEnd(payload);
    });
    socket.on("state:snapshot", (payload) => {
      onSnapshot(payload);
    });

    return () => {
      socket.close();
      socketRef.current = null;
      setHasGameStarted(false);
      setHasGameEnded(false);
      onInputSenderChange(null);
      onRoomChange(null);
    };
  }, [onCapture, onGameEnd, onGameStart, onInputSenderChange, onRoomChange, onSnapshot, socketUrl]);

  const canUseRoomActions = connectionState === "connected";
  const isReady = room?.phase === "ready";
  const isEnded = hasGameEnded || room?.phase === "ended";
  const isEntry = !room;
  const isWaitingForOpponent = Boolean(room && !isReady && !isEnded);
  const selfPlayer = room?.players.find((player) => player.id === room.playerId);

  if (hasGameStarted && !isEnded) {
    return null;
  }

  const createRoom = () => {
    setError("");
    setIsNumberPadOpen(false);
    socketRef.current?.emit("room:create", {}, (response) => {
      if (isServerError(response)) {
        setError(response.message);
        return;
      }

      setRoom(response);
      onRoomChange(response);
      setRoomCodeInput(response.roomCode);
      readyPlayerCountRef.current = response.players.filter((player) => player.ready).length;
    });
  };

  const joinRoom = () => {
    const roomCode = normalizeRoomCodeDraft(roomCodeInput);

    if (!roomCode) {
      setError("Room codeを入力してください");
      return;
    }

    setError("");
    setIsNumberPadOpen(false);
    startBgm();
    socketRef.current?.emit("room:join", { roomCode }, (response) => {
      if (isServerError(response)) {
        setError(response.message);
        return;
      }

      setRoom(response);
      onRoomChange(response);
      setRoomCodeInput(response.roomCode);
      readyPlayerCountRef.current = response.players.filter((player) => player.ready).length;
    });
  };

  const sendGameReady = () => {
    setError("");
    setButtonPopKey((current) => current + 1);
    startBgm();
    socketRef.current?.emit("game:ready");
  };

  const leaveRoom = () => {
    setError("");
    socketRef.current?.emit("room:leave", (response) => {
      if (response && isLeaveError(response)) {
        setError(response.message);
        return;
      }

      setRoom(null);
      onRoomChange(null);
      setRoomCodeInput("");
      setIsNumberPadOpen(false);
      setHasGameStarted(false);
      setHasGameEnded(false);
      readyPlayerCountRef.current = 0;
    });
  };

  const handleRoomCodeChange = (event: ChangeEvent<HTMLInputElement>) => {
    setRoomCodeInput(normalizeRoomCodeDraft(event.currentTarget.value));
  };

  const openNumberPad = () => {
    if (usesTouchNumberPad) {
      setIsNumberPadOpen(true);
    }
  };

  const appendRoomDigit = (digit: string) => {
    setRoomCodeInput((current) => normalizeRoomCodeDraft(`${current}${digit}`));
  };

  const deleteRoomDigit = () => {
    setRoomCodeInput((current) => current.slice(0, -1));
  };

  const shouldShowNumberPad = isEntry && usesTouchNumberPad && isNumberPadOpen;
  const panelClassName = [
    "room-panel",
    isReady ? "room-panel--ready-controls" : "",
    isReady && showReadyControls ? "room-panel--ready-visible" : "",
    isEnded ? "room-panel--ended-controls" : "",
    shouldShowNumberPad ? "room-panel--number-pad-open" : ""
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      <div
        className={`connection-status connection-status--${connectionState}`}
      >
        {connectionState.toUpperCase()}
      </div>

      <div className={panelClassName}>
        {!isReady && !isEnded ? <div className="room-panel__title">ROOM</div> : null}

        {isEntry ? (
          <>
            <button
              type="button"
              className="room-panel__create-button"
              onClick={createRoom}
              disabled={!canUseRoomActions}
            >
              CREATE ROOM
            </button>
            <div className="room-panel__divider">or</div>
            <div className="room-panel__join">
              <input
                className="room-panel__code-input"
                aria-label="Room code"
                autoCapitalize="off"
                autoComplete="off"
                autoCorrect="off"
                inputMode={usesTouchNumberPad ? "none" : "numeric"}
                maxLength={5}
                pattern="[0-9]*"
                placeholder="ROOM CODE"
                readOnly={usesTouchNumberPad}
                spellCheck={false}
                value={roomCodeInput}
                onChange={handleRoomCodeChange}
                onFocus={openNumberPad}
                onPointerDown={openNumberPad}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    joinRoom();
                  }
                }}
              />
              <button
                type="button"
                className="room-panel__join-button"
                onClick={joinRoom}
                disabled={!canUseRoomActions}
              >
                JOIN
              </button>
            </div>
          </>
        ) : null}

        {isWaitingForOpponent ? (
          <>
            <div className="room-panel__room">
              <div className="room-panel__label">ROOM CODE</div>
              <div className="room-panel__code">{room?.roomCode}</div>
              <div className="room-panel__hint">もう1人がJOINするとゲーム画面に進みます</div>
            </div>
            <button type="button" className="room-panel__secondary-button" onClick={leaveRoom}>
              BACK
            </button>
          </>
        ) : null}

        {isReady && showReadyControls ? (
          <>
            <div
              className={`room-panel__ready-state room-panel__hint room-panel__hint--ready${
                selfPlayer?.ready ? " room-panel__hint--waiting-opponent" : ""
              }`}
            >
              {selfPlayer?.ready ? "WAITING..." : "READY?"}
            </div>
            <div className="ready-status-dots" aria-hidden="true">
              {room?.players.map((player) => (
                <span
                  key={player.id}
                  className={`ready-status-dot${player.ready ? " ready-status-dot--on" : ""}`}
                />
              ))}
            </div>
            <button
              key={`ready-${buttonPopKey}`}
              type="button"
              className="room-panel__action-button"
              onClick={sendGameReady}
              disabled={!canUseRoomActions || selfPlayer?.ready}
            >
              {selfPlayer?.ready ? "READY!" : "TAP READY"}
            </button>
          </>
        ) : null}

        {isEnded ? (
          <button
            key={`restart-${buttonPopKey}`}
            type="button"
            className="room-panel__action-button"
            onClick={sendGameReady}
            disabled={!canUseRoomActions}
          >
            RESTART
          </button>
        ) : null}

        {error ? <div className="room-panel__error">{error}</div> : null}
      </div>

      {shouldShowNumberPad ? (
        <div className="room-code-pad" aria-label="Room code number pad">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((digit) => (
            <button key={digit} type="button" onClick={() => appendRoomDigit(digit)}>
              {digit}
            </button>
          ))}
          <button type="button" onClick={deleteRoomDigit}>
            DEL
          </button>
          <button type="button" onClick={() => appendRoomDigit("0")}>
            0
          </button>
          <button type="button" onClick={() => setIsNumberPadOpen(false)}>
            OK
          </button>
        </div>
      ) : null}
    </>
  );
}
