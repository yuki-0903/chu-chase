export type PlayerId = string;
export type RoomCode = string;

export type PlayerRole = "tagger" | "runner";
export type RoomPhase = "waiting" | "stage-select" | "ready" | "countdown" | "playing" | "ended";
export type StageVariant = "plain" | "maze";
export type AwkwardnessLevel = "far" | "medium" | "near" | "danger";
export type EndReason = "tagger-captured" | "runner-survived" | "room-closed" | "player-left";

export interface Vector2 {
  x: number;
  y: number;
}

export interface PlayerInputPayload {
  sequence: number;
  direction: Vector2;
  sentAt: number;
}

export interface CreateRoomPayload {
  nickname?: string;
}

export interface JoinRoomPayload {
  roomCode: RoomCode;
  nickname?: string;
}

export interface SelectStagePayload {
  stageVariant: StageVariant;
}

export interface RoomCreatedPayload {
  roomCode: RoomCode;
  playerId: PlayerId;
  phase: RoomPhase;
  round: number;
  stageVariant: StageVariant;
  players: PublicPlayer[];
  settings: MatchSettingsPayload;
}

export interface RoomJoinedPayload {
  roomCode: RoomCode;
  playerId: PlayerId;
  phase: RoomPhase;
  round: number;
  stageVariant: StageVariant;
  players: PublicPlayer[];
  settings: MatchSettingsPayload;
}

export interface MatchSettingsPayload {
  matchDurationMs: number;
  capturesToWin: number;
  captureRadius: number;
  playerSpeed: number;
  itemsEnabled: boolean;
}

export interface PublicPlayer {
  id: PlayerId;
  nickname: string;
  role?: PlayerRole;
  connected: boolean;
  ready: boolean;
}

export interface PlayerSnapshot extends PublicPlayer {
  role: PlayerRole;
  position: Vector2;
  velocity: Vector2;
}

export interface GameSnapshotPayload {
  serverTime: number;
  roomCode: RoomCode;
  phase: RoomPhase;
  round: number;
  stageVariant: StageVariant;
  remainingMs: number;
  captureCount: number;
  players: PlayerSnapshot[];
}

export interface GameStartPayload {
  roomCode: RoomCode;
  serverTime: number;
  startsAt: number;
  round: number;
  stageVariant: StageVariant;
  players: PlayerSnapshot[];
}

export interface CaptureHappenedPayload {
  roomCode: RoomCode;
  serverTime: number;
  captureCount: number;
  taggerId: PlayerId;
  runnerId: PlayerId;
  position: Vector2;
}

export interface GameEndedPayload {
  roomCode: RoomCode;
  serverTime: number;
  round: number;
  winnerRole?: PlayerRole;
  reason: EndReason;
  captureCount: number;
}

export interface ServerErrorPayload {
  code:
    | "room-not-found"
    | "room-full"
    | "room-already-started"
    | "invalid-room-code"
    | "not-in-room"
    | "already-in-room"
    | "rate-limited"
    | "server-busy"
    | "server-error";
  message: string;
}

export interface ServerHelloPayload {
  socketId: string;
  serverTime: number;
}

export interface ClientToServerEvents {
  "room:create": (
    payload: CreateRoomPayload,
    ack?: (response: RoomCreatedPayload | ServerErrorPayload) => void
  ) => void;
  "room:join": (
    payload: JoinRoomPayload,
    ack?: (response: RoomJoinedPayload | ServerErrorPayload) => void
  ) => void;
  "room:select-stage": (
    payload: SelectStagePayload,
    ack?: (response: RoomJoinedPayload | ServerErrorPayload) => void
  ) => void;
  "room:leave": (ack?: (response: { ok: true } | ServerErrorPayload) => void) => void;
  "game:ready": () => void;
  "input:update": (payload: PlayerInputPayload) => void;
}

export interface ServerToClientEvents {
  "server:hello": (payload: ServerHelloPayload) => void;
  "room:created": (payload: RoomCreatedPayload) => void;
  "room:joined": (payload: RoomJoinedPayload) => void;
  "room:waiting": (payload: RoomJoinedPayload) => void;
  "game:start": (payload: GameStartPayload) => void;
  "state:snapshot": (payload: GameSnapshotPayload) => void;
  "capture:happened": (payload: CaptureHappenedPayload) => void;
  "game:ended": (payload: GameEndedPayload) => void;
  "server:error": (payload: ServerErrorPayload) => void;
}

export interface InterServerEvents {
  ping: () => void;
}

export interface SocketData {
  playerId?: PlayerId;
  roomCode?: RoomCode;
}
