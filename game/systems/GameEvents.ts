export interface SceneReadyPayload {
  sceneKey: string;
}

export interface AudioSettingsPayload {
  bgmEnabled: boolean;
  seEnabled: boolean;
}

type GameEventMap = {
  "assets:ready": undefined;
  "scene:ready": SceneReadyPayload;
  "game:pause": undefined;
  "game:resume": undefined;
  "audio:settings-changed": AudioSettingsPayload;
};

type EventName = keyof GameEventMap;
type Handler<TName extends EventName> = (payload: GameEventMap[TName]) => void;

class TypedGameEvents {
  private readonly target = new EventTarget();

  emit<TName extends EventName>(name: TName, payload?: GameEventMap[TName]) {
    this.target.dispatchEvent(new CustomEvent(name, { detail: payload }));
  }

  on<TName extends EventName>(name: TName, handler: Handler<TName>) {
    const listener = (event: Event) => {
      handler((event as CustomEvent<GameEventMap[TName]>).detail);
    };

    this.target.addEventListener(name, listener);
    return () => this.target.removeEventListener(name, listener);
  }
}

export const gameEvents = new TypedGameEvents();
