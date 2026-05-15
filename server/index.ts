import express from "express";
import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { Server, type Socket } from "socket.io";
import {
  CAPTURE_RADIUS,
  CAPTURES_TO_WIN,
  ARENA_RADIUS,
  MATCH_DURATION_MS,
  MAX_PLAYERS_PER_ROOM,
  PLAYER_SPEED,
  ROOM_CODE_LENGTH,
  DODGER_HEAD_START_MS
} from "../shared/constants";
import type {
  ClientToServerEvents,
  EndReason,
  GameEndedPayload,
  GameSnapshotPayload,
  InterServerEvents,
  MatchSettingsPayload,
  PlayerId,
  PlayerInputPayload,
  PlayerRole,
  PlayerSnapshot,
  PublicPlayer,
  RoomCode,
  RoomJoinedPayload,
  RoomPhase,
  ServerErrorPayload,
  ServerToClientEvents,
  SocketData
} from "../shared/protocol";

interface RoomPlayer {
  id: PlayerId;
  socketId: string;
  nickname: string;
  role?: PlayerRole;
  connected: boolean;
  ready: boolean;
  position: { x: number; y: number };
  velocity: { x: number; y: number };
  input: { x: number; y: number };
}

interface Room {
  code: RoomCode;
  phase: RoomPhase;
  players: RoomPlayer[];
  settings: MatchSettingsPayload;
  createdAt: number;
  updatedAt: number;
  startedAt?: number;
  endsAt?: number;
  captureCount: number;
  winnerRole?: PlayerRole;
  endReason?: EndReason;
}

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

const PORT = Number(process.env.PORT ?? 3002);
const CLIENT_ORIGINS = parseClientOrigins(process.env.CLIENT_ORIGIN);
const MAX_ROOMS = Number(process.env.MAX_ROOMS ?? 300);
const WAITING_ROOM_TTL_MS = Number(process.env.WAITING_ROOM_TTL_MS ?? 10 * 60 * 1000);
const ENDED_ROOM_TTL_MS = Number(process.env.ENDED_ROOM_TTL_MS ?? 5 * 60 * 1000);
const DISCONNECTED_ROOM_TTL_MS = Number(process.env.DISCONNECTED_ROOM_TTL_MS ?? 2 * 60 * 1000);
const rooms = new Map<RoomCode, Room>();
const rateLimits = new Map<string, RateLimitBucket>();

const defaultSettings: MatchSettingsPayload = {
  matchDurationMs: MATCH_DURATION_MS,
  capturesToWin: CAPTURES_TO_WIN,
  captureRadius: CAPTURE_RADIUS,
  playerSpeed: PLAYER_SPEED,
  itemsEnabled: false
};

const app = express();
const httpServer = createServer(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(
  httpServer,
  {
    cors: {
      origin: (origin, callback) => {
        if (isAllowedOrigin(origin)) {
          callback(null, true);
          return;
        }

        callback(new Error("Origin is not allowed."));
      }
    }
  }
);
type ServerSocket = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

app.get("/health", (_request, response) => {
  response.json({
    ok: true,
    rooms: rooms.size,
    service: "chu-chase-socket",
    time: Date.now()
  });
});

io.on("connection", (socket) => {
  const clientKey = getClientKey(socket);

  socket.emit("server:hello", {
    socketId: socket.id,
    serverTime: Date.now()
  });

  socket.on("room:create", (payload, ack) => {
    if (isRateLimited(`room:create:${clientKey}`, 5, 60_000)) {
      ack?.(createError("rate-limited", "Please wait before creating another room."));
      return;
    }

    cleanupRooms();

    if (rooms.size >= MAX_ROOMS) {
      ack?.(createError("server-busy", "Server is busy. Please try again later."));
      return;
    }

    if (socket.data.roomCode && socket.data.playerId) {
      ack?.(createError("already-in-room", "You are already in a room."));
      return;
    }

    const room = createRoom();
    const player = createRoomPlayer(socket.id, payload.nickname);
    room.players.push(player);
    rooms.set(room.code, room);
    socket.data.playerId = player.id;
    socket.data.roomCode = room.code;
    socket.join(room.code);

    const response = buildRoomPayload(room, player.id);
    socket.emit("room:created", response);
    socket.emit("room:waiting", response);
    ack?.(response);
  });

  socket.on("room:join", (payload, ack) => {
    if (isRateLimited(`room:join:${clientKey}`, 20, 60_000)) {
      ack?.(createError("rate-limited", "Please wait before joining another room."));
      return;
    }

    const roomCode = normalizeRoomCode(payload.roomCode);

    if (isRateLimitBlocked(`room:join-fail:${clientKey}`)) {
      ack?.(createError("rate-limited", "Too many failed room attempts. Please wait."));
      return;
    }

    if (!isValidRoomCode(roomCode)) {
      markInvalidJoin(clientKey);
      ack?.(createError("invalid-room-code", "Room code is invalid."));
      return;
    }

    const room = rooms.get(roomCode);

    if (!room) {
      markInvalidJoin(clientKey);
      ack?.(createError("room-not-found", "Room was not found."));
      return;
    }

    if (room.phase !== "waiting" && room.phase !== "ready") {
      ack?.(createError("room-already-started", "Room has already started."));
      return;
    }

    const reconnectingPlayer = room.players.find((player) => player.socketId === socket.id);

    if (reconnectingPlayer) {
      reconnectingPlayer.connected = true;
      socket.data.playerId = reconnectingPlayer.id;
      socket.data.roomCode = room.code;
      socket.join(room.code);
      touchRoom(room);
      const response = buildRoomPayload(room, reconnectingPlayer.id);
      ack?.(response);
      return;
    }

    if (room.players.length >= MAX_PLAYERS_PER_ROOM) {
      ack?.(createError("room-full", "Room is full."));
      return;
    }

    const player = createRoomPlayer(socket.id, payload.nickname);
    room.players.push(player);
    socket.data.playerId = player.id;
    socket.data.roomCode = room.code;
    socket.join(room.code);

    if (room.players.length === MAX_PLAYERS_PER_ROOM) {
      assignRoles(room);
      room.phase = "ready";
    }

    touchRoom(room);
    const response = buildRoomPayload(room, player.id);
    socket.emit("room:joined", response);
    emitRoomUpdate(room);
    ack?.(response);
  });

  socket.on("room:leave", (ack) => {
    const roomCode = socket.data.roomCode;
    const playerId = socket.data.playerId;

    if (!roomCode || !playerId) {
      ack?.(createError("not-in-room", "You are not in a room."));
      return;
    }

    leaveRoom(socket, roomCode, playerId);
    ack?.({ ok: true });
  });

  socket.on("game:ready", () => {
    if (isRateLimited(`game:ready:${socket.id}`, 10, 10_000)) {
      socket.emit("server:error", createError("rate-limited", "Please wait before trying ready again."));
      return;
    }

    const roomCode = socket.data.roomCode;
    const playerId = socket.data.playerId;

    if (!roomCode || !playerId) {
      socket.emit("server:error", createError("not-in-room", "You are not in a room."));
      return;
    }

    const room = rooms.get(roomCode);

    if (!room) {
      socket.emit("server:error", createError("room-not-found", "Room was not found."));
      return;
    }

    if (room.phase === "ended") {
      prepareRoomForRematch(room);
    }

    if (room.phase !== "ready") {
      socket.emit("server:error", createError("room-already-started", "Room is not ready."));
      return;
    }

    const player = room.players.find((roomPlayer) => roomPlayer.id === playerId);

    if (!player) {
      socket.emit("server:error", createError("not-in-room", "You are not in this room."));
      return;
    }

    player.ready = true;
    touchRoom(room);
    emitRoomUpdate(room);

    if (room.players.length === MAX_PLAYERS_PER_ROOM && room.players.every((roomPlayer) => roomPlayer.ready)) {
      room.phase = "playing";
      startRoom(room);
      io.to(room.code).emit("game:start", buildGameStartPayload(room));
      broadcastSnapshot(room);
    }
  });

  socket.on("input:update", (payload) => {
    if (isRateLimited(`input:update:${socket.id}`, 45, 1_000)) {
      return;
    }

    const roomCode = socket.data.roomCode;
    const playerId = socket.data.playerId;

    if (!roomCode || !playerId) {
      return;
    }

    const room = rooms.get(roomCode);
    const player = room?.players.find((roomPlayer) => roomPlayer.id === playerId);

    if (!room || !player || room.phase !== "playing") {
      return;
    }

    player.input = normalizeInput(payload);
  });

  socket.on("disconnect", () => {
    const roomCode = socket.data.roomCode;
    const playerId = socket.data.playerId;

    if (!roomCode || !playerId) {
      return;
    }

    const room = rooms.get(roomCode);

    if (!room) {
      return;
    }

    const player = room.players.find((roomPlayer) => roomPlayer.id === playerId);

    if (player) {
      player.connected = false;
    }

    if (room.players.every((roomPlayer) => !roomPlayer.connected)) {
      rooms.delete(room.code);
      return;
    }

    emitRoomUpdate(room);
  });
});

httpServer.listen(PORT, () => {
  console.log(`CHU CHASE socket server listening on http://localhost:${PORT}`);
});

function createRoom(): Room {
  const now = Date.now();

  return {
    code: createUniqueRoomCode(),
    phase: "waiting",
    players: [],
    settings: { ...defaultSettings },
    createdAt: now,
    updatedAt: now,
    captureCount: 0
  };
}

function createRoomPlayer(socketId: string, nickname?: string): RoomPlayer {
  return {
    id: randomUUID(),
    socketId,
    nickname: normalizeNickname(nickname),
    connected: true,
    ready: false,
    position: { x: 0, y: 0 },
    velocity: { x: 0, y: 0 },
    input: { x: 0, y: 0 }
  };
}

function buildRoomPayload(room: Room, playerId: PlayerId): RoomJoinedPayload {
  return {
    roomCode: room.code,
    playerId,
    phase: room.phase,
    players: room.players.map(toPublicPlayer),
    settings: room.settings
  };
}

function emitRoomUpdate(room: Room) {
  touchRoom(room);

  room.players.forEach((player) => {
    io.to(player.socketId).emit("room:waiting", buildRoomPayload(room, player.id));
  });
}

function leaveRoom(socket: ServerSocket, roomCode: RoomCode, playerId: PlayerId) {
  const room = rooms.get(roomCode);

  socket.leave(roomCode);
  socket.data.roomCode = undefined;
  socket.data.playerId = undefined;

  if (!room) {
    return;
  }

  room.players = room.players.filter((player) => player.id !== playerId);

  if (room.players.length === 0) {
    rooms.delete(room.code);
    return;
  }

  if (room.phase === "ready") {
    room.phase = "waiting";
    room.players.forEach((player) => {
      player.ready = false;
      player.role = undefined;
    });
  }

  emitRoomUpdate(room);
}

function toPublicPlayer(player: RoomPlayer): PublicPlayer {
  return {
    id: player.id,
    nickname: player.nickname,
    role: player.role,
    connected: player.connected,
    ready: player.ready
  };
}

function buildGameStartPayload(room: Room) {
  const now = Date.now();
  return {
    roomCode: room.code,
    serverTime: now,
    startsAt: room.startedAt ?? now,
    players: room.players.map(toPlayerSnapshot)
  };
}

function buildSnapshot(room: Room): GameSnapshotPayload {
  return {
    serverTime: Date.now(),
    roomCode: room.code,
    phase: room.phase,
    remainingMs: Math.max(0, (room.endsAt ?? Date.now()) - Date.now()),
    captureCount: room.captureCount,
    players: room.players.map(toPlayerSnapshot)
  };
}

function toPlayerSnapshot(player: RoomPlayer): PlayerSnapshot {
  return {
    ...toPublicPlayer(player),
    role: player.role ?? "runner",
    position: { ...player.position },
    velocity: { ...player.velocity }
  };
}

function startRoom(room: Room) {
  const now = Date.now();
  room.updatedAt = now;
  room.startedAt = now;
  room.endsAt = now + room.settings.matchDurationMs;
  room.captureCount = 0;

  room.players.forEach((player) => {
    player.input = { x: 0, y: 0 };
    player.velocity = { x: 0, y: 0 };
    player.position = player.role === "tagger" ? { x: -2.4, y: 0 } : { x: 2.4, y: -0.35 };
  });
}

function prepareRoomForRematch(room: Room) {
  room.phase = "ready";
  touchRoom(room);
  room.startedAt = undefined;
  room.endsAt = undefined;
  room.captureCount = 0;
  room.winnerRole = undefined;
  room.endReason = undefined;
  assignRoles(room);

  room.players.forEach((player) => {
    player.ready = false;
    player.input = { x: 0, y: 0 };
    player.velocity = { x: 0, y: 0 };
    player.position = player.role === "tagger" ? { x: -2.4, y: 0 } : { x: 2.4, y: -0.35 };
  });
}

function broadcastSnapshot(room: Room) {
  io.to(room.code).emit("state:snapshot", buildSnapshot(room));
}

function normalizeInput(payload: PlayerInputPayload) {
  const x = clamp(payload.direction.x, -1, 1);
  const y = clamp(payload.direction.y, -1, 1);
  const length = Math.hypot(x, y);

  if (length <= 1) {
    return { x, y };
  }

  return {
    x: x / length,
    y: y / length
  };
}

function updatePlayingRooms() {
  const deltaSeconds = 1 / 30;
  const now = Date.now();

  rooms.forEach((room) => {
    if (room.phase !== "playing") {
      return;
    }

    room.players.forEach((player) => {
      const isTaggerHeadStartLocked =
        player.role === "tagger" && Boolean(room.startedAt && now - room.startedAt < DODGER_HEAD_START_MS);
      const input = isTaggerHeadStartLocked ? { x: 0, y: 0 } : player.input;

      player.velocity = {
        x: input.x * room.settings.playerSpeed,
        y: input.y * room.settings.playerSpeed
      };
      player.position.x += player.velocity.x * deltaSeconds;
      player.position.y += player.velocity.y * deltaSeconds;
      keepPlayerInsideArena(player.position);
    });

    const capture = findCapture(room);
    if (capture) {
      room.captureCount += 1;
      io.to(room.code).emit("capture:happened", {
        roomCode: room.code,
        serverTime: now,
        captureCount: room.captureCount,
        taggerId: capture.tagger.id,
        runnerId: capture.runner.id,
        position: {
          x: (capture.tagger.position.x + capture.runner.position.x) / 2,
          y: (capture.tagger.position.y + capture.runner.position.y) / 2
        }
      });

      if (room.captureCount >= room.settings.capturesToWin) {
        endRoom(room, "tagger", "tagger-captured");
        return;
      }
    }

    if ((room.endsAt ?? now) <= now) {
      endRoom(room, "runner", "runner-survived");
      return;
    }

    broadcastSnapshot(room);
  });
}

function findCapture(room: Room) {
  const tagger = room.players.find((player) => player.role === "tagger");
  const runner = room.players.find((player) => player.role === "runner");

  if (!tagger || !runner) {
    return null;
  }

  const distance = Math.hypot(tagger.position.x - runner.position.x, tagger.position.y - runner.position.y);
  return distance <= room.settings.captureRadius ? { tagger, runner } : null;
}

function endRoom(room: Room, winnerRole: PlayerRole, reason: EndReason) {
  room.phase = "ended";
  touchRoom(room);
  room.winnerRole = winnerRole;
  room.endReason = reason;
  room.players.forEach((player) => {
    player.input = { x: 0, y: 0 };
    player.velocity = { x: 0, y: 0 };
  });

  broadcastSnapshot(room);
  io.to(room.code).emit("game:ended", buildGameEndedPayload(room, winnerRole, reason));
  emitRoomUpdate(room);
}

function buildGameEndedPayload(room: Room, winnerRole: PlayerRole | undefined, reason: EndReason): GameEndedPayload {
  return {
    roomCode: room.code,
    serverTime: Date.now(),
    winnerRole,
    reason,
    captureCount: room.captureCount
  };
}

function keepPlayerInsideArena(position: { x: number; y: number }) {
  const limit = ARENA_RADIUS - 0.75;
  const length = Math.hypot(position.x, position.y);

  if (length > limit) {
    position.x = (position.x / length) * limit;
    position.y = (position.y / length) * limit;
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function touchRoom(room: Room) {
  room.updatedAt = Date.now();
}

function getClientKey(socket: ServerSocket) {
  const forwardedFor = socket.handshake.headers["x-forwarded-for"];
  const forwardedAddress = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
  const firstForwardedAddress = forwardedAddress?.split(",")[0]?.trim();
  return firstForwardedAddress || socket.handshake.address || socket.id;
}

function isRateLimited(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const current = rateLimits.get(key);

  if (!current || current.resetAt <= now) {
    rateLimits.set(key, {
      count: 1,
      resetAt: now + windowMs
    });
    return false;
  }

  current.count += 1;
  return current.count > limit;
}

function isRateLimitBlocked(key: string) {
  const current = rateLimits.get(key);
  return Boolean(current && current.resetAt > Date.now() && current.count > 8);
}

function markInvalidJoin(clientKey: string) {
  isRateLimited(`room:join-fail:${clientKey}`, 8, 60_000);
}

function cleanupRateLimits() {
  const now = Date.now();

  rateLimits.forEach((bucket, key) => {
    if (bucket.resetAt <= now) {
      rateLimits.delete(key);
    }
  });
}

function cleanupRooms() {
  const now = Date.now();

  rooms.forEach((room) => {
    const ageMs = now - room.createdAt;
    const idleMs = now - room.updatedAt;
    const hasConnectedPlayer = room.players.some((player) => player.connected);

    if (!hasConnectedPlayer && idleMs >= DISCONNECTED_ROOM_TTL_MS) {
      rooms.delete(room.code);
      return;
    }

    if ((room.phase === "waiting" || room.phase === "ready") && ageMs >= WAITING_ROOM_TTL_MS) {
      closeRoom(room, "room-closed");
      rooms.delete(room.code);
      return;
    }

    if (room.phase === "ended" && idleMs >= ENDED_ROOM_TTL_MS) {
      rooms.delete(room.code);
    }
  });
}

function closeRoom(room: Room, reason: EndReason) {
  room.players.forEach((player) => {
    io.to(player.socketId).emit("game:ended", buildGameEndedPayload(room, undefined, reason));
  });
}

function assignRoles(room: Room) {
  const [firstPlayer, secondPlayer] = room.players;

  if (!firstPlayer || !secondPlayer) {
    return;
  }

  const firstIsTagger = Math.random() < 0.5;
  firstPlayer.role = firstIsTagger ? "tagger" : "runner";
  secondPlayer.role = firstIsTagger ? "runner" : "tagger";
}

function createUniqueRoomCode(): RoomCode {
  let code = createRoomCode();

  while (rooms.has(code)) {
    code = createRoomCode();
  }

  return code;
}

function createRoomCode(): RoomCode {
  const alphabet = "0123456789";
  let code = "";

  for (let index = 0; index < ROOM_CODE_LENGTH; index += 1) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }

  return code;
}

function normalizeRoomCode(roomCode: RoomCode): RoomCode {
  return roomCode.trim();
}

function isValidRoomCode(roomCode: RoomCode) {
  return roomCode.length === ROOM_CODE_LENGTH && /^\d+$/.test(roomCode);
}

function normalizeNickname(nickname?: string) {
  const normalized = nickname?.trim();
  return normalized ? normalized.slice(0, 18) : "Guest";
}

function createError(code: ServerErrorPayload["code"], message: string): ServerErrorPayload {
  return {
    code,
    message
  };
}

function parseClientOrigins(value?: string) {
  if (!value || value.trim() === "*" || value.trim() === "") {
    return "*";
  }

  return value
    .split(",")
    .map(normalizeOrigin)
    .filter(Boolean);
}

function isAllowedOrigin(origin?: string) {
  if (CLIENT_ORIGINS === "*") {
    return true;
  }

  if (!origin) {
    return true;
  }

  return CLIENT_ORIGINS.includes(normalizeOrigin(origin));
}

function normalizeOrigin(origin: string) {
  return origin.trim().replace(/\/+$/, "");
}

setInterval(updatePlayingRooms, 1000 / 30);
setInterval(cleanupRooms, 30_000);
setInterval(cleanupRateLimits, 60_000);
