import * as THREE from "three";
import {
  createOniAvatar,
  createRunnerAvatar,
  type AvatarDebugSettings,
  type ChuAvatar
} from "@/game/avatars/ChuAvatars";
import { GAME_BALANCE } from "@/game/config/balance";
import { BACKGROUND_COLOR, getGameSize } from "@/game/config/gameConfig";
import { NEU_COLORS, NEU_COLOR_STRINGS } from "@/game/config/neumorphismPalette";
import { gameEvents } from "@/game/systems/GameEvents";
import {
  playChuserLockSfx,
  playChuserReleaseSfx,
  playEscapeStartSfx,
  playFootstepSfx,
  playKissCaptureSfx
} from "@/game/systems/Sfx";
import {
  isForcedLandscapeView,
  ThreeInputController
} from "@/game/systems/ThreeInputController";
import { DODGER_HEAD_START_MS } from "@/shared/constants";
import { getStageWalls } from "@/shared/stages";
import type {
  CaptureHappenedPayload,
  GameSnapshotPayload,
  GameStartPayload,
  PlayerId,
  PlayerInputPayload,
  PlayerRole,
  PlayerSnapshot,
  StageVariant,
  Vector2
} from "@/shared/protocol";

export interface ThreeGameHandle {
  destroy: () => void;
  playCapture: (payload: CaptureHappenedPayload, selfPlayerId?: PlayerId) => void;
  startReadyIntro: () => void;
  startOnlineMatch: (
    payload: GameStartPayload,
    selfPlayerId?: PlayerId,
    onInput?: (payload: PlayerInputPayload) => void
  ) => void;
  setSelfRole: (role?: PlayerRole) => void;
  setSnapshot: (snapshot: GameSnapshotPayload, selfPlayerId?: PlayerId) => void;
  setStageVariant: (stageVariant?: StageVariant) => void;
}

interface ThreeGameOptions {
  autoStart?: boolean;
  canStartLocally?: boolean;
  gameStart?: GameStartPayload | null;
  onAssetsReady?: () => void;
  onInput?: (payload: PlayerInputPayload) => void;
  selfPlayerId?: PlayerId;
  selfRole?: PlayerRole;
  stageVariant?: StageVariant;
}

type GameLoopPhase = "ready" | "playing" | "result";

interface DynamicTextSprite {
  sprite: THREE.Sprite;
  setText: (text: string) => void;
}

interface LightingDebugSettings {
  ambient: number;
  hemi: number;
  key: number;
  fill: number;
  exposure: number;
  shadows: boolean;
}

interface LightRig {
  ambient: THREE.AmbientLight;
  hemi: THREE.HemisphereLight;
  key: THREE.DirectionalLight;
  fill: THREE.DirectionalLight;
}

const WORLD_FORWARD = new THREE.Vector3(0, 0, 1);
const MATCH_DURATION_SECONDS = 20;
const CAPTURE_EFFECT_MS = 900;
const CHUSER_RELEASE_EFFECT_MS = 620;
const LIGHTING_DEBUG_STORAGE_KEY = "chu-chase-lighting-debug";
const MOBILE_LIGHTING_DEBUG_STORAGE_KEY = "chu-chase-lighting-debug-mobile-v3";
const DESKTOP_RENDER_QUALITY = {
  antialias: true,
  pixelRatioCap: 2,
  renderTargetSamples: 4,
  shadowMapSize: 1024
} as const;
const TOUCH_RENDER_QUALITY = {
  antialias: false,
  pixelRatioCap: 1,
  renderTargetSamples: 0,
  shadowMapSize: 512
} as const;
const DEFAULT_LIGHTING_DEBUG: LightingDebugSettings = {
  ambient: 0.36,
  hemi: 2.25,
  key: 2.35,
  fill: 0.32,
  exposure: 1,
  shadows: true
};
const MOBILE_LIGHTING_DEBUG: LightingDebugSettings = {
  ambient: 0.46,
  hemi: 2.59,
  key: 2.12,
  fill: 0,
  exposure: 0.95,
  shadows: true
};

export function createThreeGame(parent: HTMLElement, options: ThreeGameOptions = {}): ThreeGameHandle {
  const autoStart = options.autoStart ?? false;
  const canStartLocally = options.canStartLocally ?? true;
  const isOnlineMode = !canStartLocally;
  const input = new ThreeInputController(parent);
  const { width, height } = getGameSize(parent);
  const initialRenderSize = getRenderSize(width, height);
  const renderQuality = getRenderQuality();

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(BACKGROUND_COLOR);

  const camera = new THREE.PerspectiveCamera(
    45,
    initialRenderSize.width / initialRenderSize.height,
    0.1,
    100
  );
  camera.position.set(0, 8.8, 10.8);

  const renderer = new THREE.WebGLRenderer({
    antialias: renderQuality.antialias,
    powerPreference: isTouchDevice() ? "low-power" : "high-performance"
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, renderQuality.pixelRatioCap));
  renderer.setSize(width, height);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.domElement.classList.add("three-game-renderer--loading");
  parent.appendChild(renderer.domElement);
  const loadingOverlay = createLoadingOverlay();
  parent.appendChild(loadingOverlay);

  const displayScene = new THREE.Scene();
  const displayCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const displayMaterial = createDisplayMaterial();
  const displayQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), displayMaterial);
  displayScene.add(displayQuad);

  let renderTarget = createRenderTarget(
    initialRenderSize.width,
    initialRenderSize.height,
    renderer.getPixelRatio(),
    renderQuality.renderTargetSamples
  );
  displayMaterial.uniforms.renderTexture.value = renderTarget.texture;

  const clock = new THREE.Clock();
  const world = new THREE.Group();
  scene.add(world);

  const lightingDefaults = getLightingDebugDefaults();
  const lightingDebug = loadLightingDebugSettings(lightingDefaults);
  const lightRig = addLights(scene, lightingDebug);
  applyLightingDebugSettings(renderer, lightRig, lightingDebug);
  const debugPanel = createLightingDebugPanel(parent, renderer, lightRig, lightingDebug, lightingDefaults);
  let currentStageVariant = options.stageVariant ?? "plain";
  let stage = createTemplateStage(currentStageVariant);
  world.add(stage);

  let loadedAvatarCount = 0;
  let didNotifyAssetsReady = false;
  const handleAvatarLoaded = () => {
    loadedAvatarCount += 1;
    if (loadedAvatarCount >= 2 && !didNotifyAssetsReady) {
      didNotifyAssetsReady = true;
      renderer.domElement.classList.remove("three-game-renderer--loading");
      loadingOverlay.classList.add("is-hidden");
      options.onAssetsReady?.();
    }
  };
  const avatars: Record<PlayerRole, ChuAvatar> = {
    tagger: createOniAvatar(handleAvatarLoaded),
    runner: createRunnerAvatar(handleAvatarLoaded)
  };
  const avatarDebugPanel = createAvatarDebugPanel(parent, avatars);
  const chuserLockCapsule = createChuserLockCapsule();
  avatars.tagger.root.add(chuserLockCapsule);
  const contactText = createTextSprite("＼\\ BUCHUUU /／", NEU_COLORS.gray300);
  const kissProjectile = createKissProjectileSprite();
  const promptText = createDynamicTextSprite("TAP TO START", NEU_COLORS.blueGray700, 0.82);
  const timerText = createDynamicTextSprite(`TIME ${MATCH_DURATION_SECONDS}`, NEU_COLORS.blueGray700, 0.58);
  const resultText = createDynamicTextSprite("", NEU_COLORS.pink400, 0.88);
  resetActors(avatars);
  contactText.position.set(0, 2.6, 0);
  contactText.visible = false;
  kissProjectile.position.set(0, 2.7, 0);
  kissProjectile.visible = false;
  promptText.sprite.position.set(0, 2.9, -1.2);
  timerText.sprite.position.set(0, 3.05, 3.2);
  resultText.sprite.position.set(0, 3, -0.2);
  timerText.sprite.visible = autoStart && !isOnlineMode;
  promptText.sprite.visible = !autoStart && !isOnlineMode;
  resultText.sprite.visible = false;
  world.add(
    avatars.tagger.root,
    avatars.runner.root,
    contactText,
    kissProjectile,
    promptText.sprite,
    timerText.sprite,
    resultText.sprite
  );

  let frameId = 0;
  let didEmitReady = false;
  let contactPulse = 0;
  let phase: GameLoopPhase = autoStart ? "playing" : "ready";
  let remainingSeconds = MATCH_DURATION_SECONDS;
  let resultCooldown = 0;
  let inputSequence = 0;
  let inputSendAccumulator = 0;
  let onlineInputSender = options.onInput;
  let isOnlineMatch = Boolean(options.gameStart && onlineInputSender);
  let latestSnapshot: GameSnapshotPayload | null = null;
  let latestSelfPlayerId: PlayerId | undefined = options.selfPlayerId;
  let captureEffectUntil = 0;
  let captureEffectStartedAt = 0;
  let captureFocus = new THREE.Vector3();
  let captureShake = 0;
  let latestSelfRole: PlayerRole = options.selfRole ?? "tagger";
  let chuserLockedUntil = options.gameStart ? options.gameStart.startsAt + DODGER_HEAD_START_MS : 0;
  let readyIntroStartedAt = 0;
  let didPlayHeadStartSfx = false;
  let nextFootstepAt = 0;
  let wasChuserLocked = false;
  let chuserReleaseEffectStartedAt = 0;
  const previousAvatarPositions: Record<PlayerRole, THREE.Vector3> = {
    tagger: avatars.tagger.root.position.clone(),
    runner: avatars.runner.root.position.clone()
  };
  const avatarRunAmounts: Record<PlayerRole, number> = {
    tagger: 0,
    runner: 0
  };

  if (options.gameStart) {
    latestSelfRole = getSelfRole(options.gameStart.players, latestSelfPlayerId);
    applyPlayersToAvatars(avatars, options.gameStart.players);
  }

  const resizeObserver = new ResizeObserver(() => {
    const nextSize = getGameSize(parent);
    const renderSize = getRenderSize(nextSize.width, nextSize.height);
    camera.aspect = renderSize.width / renderSize.height;
    camera.updateProjectionMatrix();
    renderer.setSize(nextSize.width, nextSize.height);
    renderTarget.dispose();
    renderTarget = createRenderTarget(
      renderSize.width,
      renderSize.height,
      renderer.getPixelRatio(),
      renderQuality.renderTargetSamples
    );
    displayMaterial.uniforms.renderTexture.value = renderTarget.texture;
  });
  resizeObserver.observe(parent);

  const animate = () => {
    frameId = window.requestAnimationFrame(animate);
    const delta = Math.min(clock.getDelta(), 0.05);
    const elapsed = clock.getElapsedTime();

    if (!didEmitReady) {
      didEmitReady = true;
      gameEvents.emit("scene:ready", { sceneKey: "PrototypeScene" });
    }

    const wantsAction = getWantsAction(input);
    if (canStartLocally && phase === "ready" && wantsAction) {
      phase = "playing";
      remainingSeconds = MATCH_DURATION_SECONDS;
      contactPulse = 0;
      promptText.sprite.visible = false;
      timerText.sprite.visible = true;
      resultText.sprite.visible = false;
      resetActors(avatars);
    }

    if (phase === "playing") {
      if (isOnlineMatch) {
        inputSendAccumulator += delta;
        if (inputSendAccumulator >= 1 / 30) {
          inputSendAccumulator = 0;
          onlineInputSender?.({
            sequence: inputSequence,
            direction: getInputDirection(input, avatars[latestSelfRole].root),
            sentAt: Date.now()
          });
          inputSequence += 1;
        }

        if (latestSnapshot) {
          latestSelfRole = getSelfRole(latestSnapshot.players, latestSelfPlayerId);
          applyPlayersToAvatars(avatars, latestSnapshot.players);
        }
      } else {
        remainingSeconds = Math.max(0, remainingSeconds - delta);
        timerText.setText(`TIME ${Math.ceil(remainingSeconds)}`);
        updatePlayer(avatars.tagger.root, input, delta);
        updateTarget(avatars.runner.root, elapsed);

        const distance = avatars.tagger.root.position.distanceTo(avatars.runner.root.position);
        const isContact = distance <= GAME_BALANCE.contactDistance;
        contactPulse = isContact ? 0.32 : Math.max(0, contactPulse - delta);

        if (isContact) {
          phase = "result";
          resultCooldown = 0.45;
          timerText.sprite.visible = false;
          resultText.setText("CAUGHT!");
          resultText.sprite.visible = true;
        } else if (remainingSeconds <= 0) {
          phase = "result";
          resultCooldown = 0.45;
          timerText.sprite.visible = false;
          resultText.setText("TIME UP");
          resultText.sprite.visible = true;
        }
      }
    } else {
      contactPulse = Math.max(0, contactPulse - delta);
      if (phase === "ready") {
        updateTarget(avatars.runner.root, elapsed);
      }
    }

    if (phase === "result") {
      resultCooldown = Math.max(0, resultCooldown - delta);
      if (canStartLocally && resultCooldown <= 0 && wantsAction) {
        phase = "playing";
        remainingSeconds = MATCH_DURATION_SECONDS;
        contactPulse = 0;
        timerText.setText(`TIME ${MATCH_DURATION_SECONDS}`);
        timerText.sprite.visible = true;
        resultText.sprite.visible = false;
        resetActors(avatars);
      }
    }

    const isCaptureActive = captureEffectUntil > Date.now();
    const captureProgress = isCaptureActive
      ? clamp((Date.now() - captureEffectStartedAt) / CAPTURE_EFFECT_MS, 0, 1)
      : 1;
    const isChuserLocked = isOnlineMatch && phase === "playing" && Date.now() < chuserLockedUntil;
    if (wasChuserLocked && !isChuserLocked) {
      chuserReleaseEffectStartedAt = elapsed;
      playChuserReleaseSfx();
    }
    wasChuserLocked = isChuserLocked;

    updateChuserLockCapsule(chuserLockCapsule, {
      elapsed,
      isLocked: isChuserLocked,
      releaseProgress: chuserReleaseEffectStartedAt > 0
        ? clamp((elapsed - chuserReleaseEffectStartedAt) / (CHUSER_RELEASE_EFFECT_MS / 1000), 0, 1)
        : 1
    });
    updateAvatarRunAmounts(avatars, previousAvatarPositions, avatarRunAmounts, delta);
    updateFootstepSfx({
      elapsed,
      isCaptureActive,
      isPlaying: phase === "playing",
      nextFootstepAt,
      runAmount: avatarRunAmounts[latestSelfRole],
      setNextFootstepAt: (value) => {
        nextFootstepAt = value;
      }
    });
    updateAvatars(avatars, elapsed, contactPulse, isCaptureActive, avatarRunAmounts);
    updateReadyDropIntro(avatars, {
      elapsed,
      isActive: phase === "ready" && !isOnlineMatch,
      startedAt: readyIntroStartedAt
    });
    if (isCaptureActive) {
      faceActorToward(avatars.tagger.root, avatars.runner.root, 0.78);
    }
    updateContactText(contactText, avatars.runner.root.position, contactPulse, isCaptureActive, captureProgress);
    updateKissProjectile(kissProjectile, avatars.runner.root.position, isCaptureActive, captureProgress);

    updateCamera(camera, avatars[latestSelfRole].root.position, {
      elapsed,
      focus: captureFocus,
      isActive: isCaptureActive,
      shake: captureShake
    });
    renderScene(renderer, scene, camera, displayScene, displayCamera, renderTarget);
  };

  animate();

  return {
    playCapture: (payload) => {
      captureFocus = new THREE.Vector3(payload.position.x, 0, payload.position.y);
      captureEffectStartedAt = Date.now();
      captureEffectUntil = captureEffectStartedAt + CAPTURE_EFFECT_MS;
      captureShake = 1;
      contactPulse = 1;
      playKissCaptureSfx();
      faceActorToward(avatars.tagger.root, avatars.runner.root, 1);
      contactText.position.copy(avatars.runner.root.position);
      contactText.position.y = 3.15;
      contactText.visible = true;
      kissProjectile.position.copy(avatars.runner.root.position);
      kissProjectile.position.y = 2.74;
      kissProjectile.visible = true;
    },
    startReadyIntro: () => {
      phase = "ready";
      isOnlineMatch = false;
      latestSnapshot = null;
      chuserLockedUntil = 0;
      wasChuserLocked = false;
      chuserReleaseEffectStartedAt = 0;
      contactPulse = 0;
      captureEffectUntil = 0;
      captureShake = 0;
      resetActors(avatars);
      contactText.visible = false;
      kissProjectile.visible = false;
      promptText.sprite.visible = false;
      timerText.sprite.visible = false;
      resultText.sprite.visible = false;
      readyIntroStartedAt = clock.getElapsedTime();
      playReadyIntroDrumroll();
      avatars.tagger.root.visible = false;
      avatars.runner.root.visible = false;
      avatars.tagger.root.rotation.y = Math.PI;
      avatars.runner.root.rotation.y = Math.PI;
      avatars.tagger.root.scale.setScalar(1);
      avatars.runner.root.scale.setScalar(1);
    },
    startOnlineMatch: (payload, selfPlayerId, onInput) => {
      onlineInputSender = onInput ?? onlineInputSender;
      latestSelfPlayerId = selfPlayerId;
      latestSelfRole = getSelfRole(payload.players, selfPlayerId);
      setStageVariant(payload.stageVariant);
      latestSnapshot = null;
      chuserLockedUntil = payload.startsAt + DODGER_HEAD_START_MS;
      wasChuserLocked = false;
      chuserReleaseEffectStartedAt = 0;
      isOnlineMatch = true;
      phase = "playing";
      didPlayHeadStartSfx = false;
      contactPulse = 0;
      inputSendAccumulator = 0;
      promptText.sprite.visible = false;
      timerText.sprite.visible = false;
      resultText.sprite.visible = false;
      applyPlayersToAvatars(avatars, payload.players);
      if (!didPlayHeadStartSfx) {
        didPlayHeadStartSfx = true;
        if (latestSelfRole === "runner") {
          playEscapeStartSfx();
        } else {
          playChuserLockSfx();
        }
      }
    },
    setSelfRole: (role) => {
      if (role) {
        latestSelfRole = role;
      }
    },
    setSnapshot: (snapshot, selfPlayerId) => {
      latestSnapshot = snapshot;
      latestSelfPlayerId = selfPlayerId;
      latestSelfRole = getSelfRole(snapshot.players, selfPlayerId);
      setStageVariant(snapshot.stageVariant);
    },
    setStageVariant: (stageVariant) => {
      setStageVariant(stageVariant);
    },
    destroy: () => {
      window.cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      input.destroy();
      parent.removeChild(loadingOverlay);
      debugPanel.remove();
      avatarDebugPanel.remove();
      parent.removeChild(renderer.domElement);
      renderTarget.dispose();
      displayQuad.geometry.dispose();
      displayMaterial.dispose();
      disposeObject(scene);
      renderer.dispose();
    }
  };

  function setStageVariant(stageVariant?: StageVariant) {
    const nextStageVariant = stageVariant ?? "plain";
    if (nextStageVariant === currentStageVariant) {
      return;
    }

    world.remove(stage);
    disposeObject(stage);
    currentStageVariant = nextStageVariant;
    stage = createTemplateStage(currentStageVariant);
    world.add(stage);
  }
}

function updateCamera(
  camera: THREE.PerspectiveCamera,
  focus: THREE.Vector3,
  capture: { elapsed: number; focus: THREE.Vector3; isActive: boolean; shake: number }
) {
  const activeFocus = capture.isActive ? capture.focus : focus;
  const height = capture.isActive ? 5.4 : 8.8;
  const distance = capture.isActive ? 6.2 : 10.8;
  const shakePower = capture.isActive ? 0.12 * capture.shake : 0;
  const shakeX = Math.sin(capture.elapsed * 82) * shakePower;
  const shakeZ = Math.cos(capture.elapsed * 74) * shakePower;
  const targetPosition = new THREE.Vector3(
    activeFocus.x + shakeX,
    height,
    activeFocus.z + distance + shakeZ
  );

  camera.position.lerp(targetPosition, capture.isActive ? 0.34 : 0.12);
  camera.lookAt(activeFocus.x, 0.9, activeFocus.z);
}

function getSelfRole(players: PlayerSnapshot[], selfPlayerId?: PlayerId): PlayerRole {
  return players.find((player) => player.id === selfPlayerId)?.role ?? players[0]?.role ?? "tagger";
}

function applyPlayersToAvatars(avatars: Record<PlayerRole, ChuAvatar>, players: PlayerSnapshot[]) {
  players.forEach((player) => {
    applySnapshotToActor(avatars[player.role].root, player);
  });
}

function applySnapshotToActor(actor: THREE.Group, snapshot: PlayerSnapshot) {
  actor.position.x = snapshot.position.x;
  actor.position.z = snapshot.position.y;

  const direction = new THREE.Vector3(snapshot.velocity.x, 0, snapshot.velocity.y);
  if (direction.length() > 0.01) {
    direction.normalize();
    actor.quaternion.slerp(new THREE.Quaternion().setFromUnitVectors(WORLD_FORWARD, direction), 0.42);
  }
}

function faceActorToward(actor: THREE.Group, target: THREE.Group, amount: number) {
  const direction = new THREE.Vector3(
    target.position.x - actor.position.x,
    0,
    target.position.z - actor.position.z
  );

  if (direction.lengthSq() <= 0.0001) {
    return;
  }

  direction.normalize();
  actor.quaternion.slerp(new THREE.Quaternion().setFromUnitVectors(WORLD_FORWARD, direction), amount);
}

function renderScene(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
  displayScene: THREE.Scene,
  displayCamera: THREE.OrthographicCamera,
  renderTarget: THREE.WebGLRenderTarget
) {
  if (!isForcedLandscapeView()) {
    renderer.render(scene, camera);
    return;
  }

  renderer.setRenderTarget(renderTarget);
  renderer.render(scene, camera);
  renderer.setRenderTarget(null);
  renderer.render(displayScene, displayCamera);
}

function getRenderSize(width: number, height: number) {
  if (isForcedLandscapeView()) {
    return {
      width: height,
      height: width
    };
  }

  return {
    width,
    height
  };
}

function createRenderTarget(width: number, height: number, pixelRatio: number, samples: number) {
  const target = new THREE.WebGLRenderTarget(
    Math.max(1, Math.floor(width * pixelRatio)),
    Math.max(1, Math.floor(height * pixelRatio)),
    {
      depthBuffer: true,
      magFilter: THREE.LinearFilter,
      minFilter: THREE.LinearFilter,
      stencilBuffer: false
    }
  );
  target.samples = samples;
  return target;
}

function createDisplayMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: {
      renderTexture: { value: null }
    },
    vertexShader: `
      varying vec2 vUv;

      void main() {
        vUv = uv;
        gl_Position = vec4(position.xy, 0.0, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D renderTexture;
      varying vec2 vUv;

      void main() {
        vec2 rotatedUv = vec2(1.0 - vUv.y, vUv.x);
        gl_FragColor = texture2D(renderTexture, rotatedUv);
      }
    `
  });
}

function addLights(scene: THREE.Scene, settings: LightingDebugSettings): LightRig {
  const renderQuality = getRenderQuality();
  const ambient = new THREE.AmbientLight(NEU_COLORS.blueGray200, settings.ambient);
  scene.add(ambient);
  const hemi = new THREE.HemisphereLight(NEU_COLORS.blueGray200, NEU_COLORS.gray300, settings.hemi);
  scene.add(hemi);

  const key = new THREE.DirectionalLight(NEU_COLORS.blueGray200, settings.key);
  key.position.set(-4, 8, 5);
  key.castShadow = settings.shadows;
  key.shadow.mapSize.set(renderQuality.shadowMapSize, renderQuality.shadowMapSize);
  configureStageShadow(key);
  scene.add(key);

  const fill = new THREE.DirectionalLight(NEU_COLORS.white, settings.fill);
  fill.position.set(5, 4, -4);
  scene.add(fill);

  return { ambient, hemi, key, fill };
}

function configureStageShadow(light: THREE.DirectionalLight) {
  const shadowCameraSize = GAME_BALANCE.arenaRadius * 1.55;
  const shadowCamera = light.shadow.camera;
  shadowCamera.left = -shadowCameraSize;
  shadowCamera.right = shadowCameraSize;
  shadowCamera.top = shadowCameraSize;
  shadowCamera.bottom = -shadowCameraSize;
  shadowCamera.near = 0.5;
  shadowCamera.far = 35;
  light.shadow.bias = -0.00012;
  light.shadow.normalBias = 0.018;
  shadowCamera.updateProjectionMatrix();
}

function getLightingDebugDefaults(): LightingDebugSettings {
  if (isTouchDevice()) {
    return { ...MOBILE_LIGHTING_DEBUG };
  }

  return { ...DEFAULT_LIGHTING_DEBUG };
}

function getRenderQuality() {
  return isTouchDevice() ? TOUCH_RENDER_QUALITY : DESKTOP_RENDER_QUALITY;
}

function getLightingDebugStorageKey() {
  return isTouchDevice() ? MOBILE_LIGHTING_DEBUG_STORAGE_KEY : LIGHTING_DEBUG_STORAGE_KEY;
}

function isTouchDevice() {
  if (typeof window === "undefined") {
    return false;
  }

  return window.matchMedia("(pointer: coarse)").matches || navigator.maxTouchPoints > 0;
}

function loadLightingDebugSettings(defaults: LightingDebugSettings): LightingDebugSettings {
  try {
    const saved = window.localStorage.getItem(getLightingDebugStorageKey());
    if (!saved) {
      return { ...defaults };
    }

    return {
      ...defaults,
      ...JSON.parse(saved)
    };
  } catch {
    return { ...defaults };
  }
}

function saveLightingDebugSettings(settings: LightingDebugSettings) {
  window.localStorage.setItem(getLightingDebugStorageKey(), JSON.stringify(settings));
}

function applyLightingDebugSettings(
  renderer: THREE.WebGLRenderer,
  lightRig: LightRig,
  settings: LightingDebugSettings
) {
  lightRig.ambient.intensity = settings.ambient;
  lightRig.hemi.intensity = settings.hemi;
  lightRig.key.intensity = settings.key;
  lightRig.fill.intensity = settings.fill;
  renderer.toneMappingExposure = settings.exposure;
  renderer.shadowMap.enabled = settings.shadows;
  lightRig.key.castShadow = settings.shadows;
}

function createLightingDebugPanel(
  parent: HTMLElement,
  renderer: THREE.WebGLRenderer,
  lightRig: LightRig,
  initialSettings: LightingDebugSettings,
  defaultSettings: LightingDebugSettings
) {
  const settings = { ...initialSettings };
  const panel = document.createElement("details");
  panel.className = "lighting-debug-panel";
  const summary = document.createElement("summary");
  summary.textContent = "LIGHT";
  panel.appendChild(summary);

  const controls = [
    { key: "ambient", label: "Ambient", min: 0, max: 1.5, step: 0.01 },
    { key: "hemi", label: "Hemi", min: 0, max: 4, step: 0.01 },
    { key: "key", label: "Key", min: 0, max: 4, step: 0.01 },
    { key: "fill", label: "Fill", min: 0, max: 2, step: 0.01 },
    { key: "exposure", label: "Exposure", min: 0.5, max: 1.5, step: 0.01 }
  ] as const;

  controls.forEach((control) => {
    const row = document.createElement("label");
    const value = document.createElement("span");
    const input = document.createElement("input");
    input.type = "range";
    input.min = String(control.min);
    input.max = String(control.max);
    input.step = String(control.step);
    input.value = String(settings[control.key]);
    value.textContent = input.value;
    row.append(control.label, input, value);
    input.addEventListener("input", () => {
      settings[control.key] = Number(input.value);
      value.textContent = Number(input.value).toFixed(2);
      applyLightingDebugSettings(renderer, lightRig, settings);
      saveLightingDebugSettings(settings);
    });
    panel.appendChild(row);
  });

  const shadowRow = document.createElement("label");
  const shadowInput = document.createElement("input");
  shadowInput.type = "checkbox";
  shadowInput.checked = settings.shadows;
  shadowRow.append("Shadows", shadowInput);
  shadowInput.addEventListener("change", () => {
    settings.shadows = shadowInput.checked;
    applyLightingDebugSettings(renderer, lightRig, settings);
    saveLightingDebugSettings(settings);
  });
  panel.appendChild(shadowRow);

  const resetButton = document.createElement("button");
  resetButton.type = "button";
  resetButton.textContent = "RESET";
  resetButton.addEventListener("click", () => {
    Object.assign(settings, defaultSettings);
    saveLightingDebugSettings(settings);
    panel.remove();
    const nextPanel = createLightingDebugPanel(parent, renderer, lightRig, settings, defaultSettings);
    nextPanel.open = true;
    applyLightingDebugSettings(renderer, lightRig, settings);
  });
  panel.appendChild(resetButton);

  parent.appendChild(panel);
  return panel;
}

function createAvatarDebugPanel(parent: HTMLElement, avatars: Record<PlayerRole, ChuAvatar>) {
  const panel = document.createElement("details");
  panel.className = "avatar-debug-panel";
  const summary = document.createElement("summary");
  summary.textContent = "AVATAR";
  panel.appendChild(summary);

  ([
    ["tagger", "CHUSER"],
    ["runner", "DODGER"]
  ] as const).forEach(([role, label]) => {
    const fieldset = document.createElement("fieldset");
    const legend = document.createElement("legend");
    legend.textContent = label;
    fieldset.appendChild(legend);

    const controls = [
      { key: "scale", label: "Scale", min: 0.7, max: 1.6, step: 0.01 },
      { key: "lightness", label: "Light", min: 0, max: 1, step: 0.01 },
      { key: "roughness", label: "Rough", min: 0, max: 1, step: 0.01 },
      { key: "metalness", label: "Metal", min: 0, max: 1, step: 0.01 },
      { key: "envMapIntensity", label: "Env", min: 0, max: 2, step: 0.01 }
    ] as const;
    const bindings: Array<{
      input: HTMLInputElement;
      key: keyof AvatarDebugSettings;
      value: HTMLSpanElement;
    }> = [];

    controls.forEach((control) => {
      const row = document.createElement("label");
      const value = document.createElement("span");
      const input = document.createElement("input");
      input.type = "range";
      input.min = String(control.min);
      input.max = String(control.max);
      input.step = String(control.step);
      input.value = String(avatars[role].getDebugSettings()[control.key]);
      value.textContent = Number(input.value).toFixed(2);
      row.append(control.label, input, value);
      input.addEventListener("input", () => {
        const settings = avatars[role].getDebugSettings();
        settings[control.key] = Number(input.value);
        value.textContent = Number(input.value).toFixed(2);
        avatars[role].setDebugSettings(settings);
      });
      bindings.push({ input, key: control.key, value });
      fieldset.appendChild(row);
    });

    const resetButton = document.createElement("button");
    resetButton.type = "button";
    resetButton.textContent = `RESET ${label}`;
    resetButton.addEventListener("click", () => {
      const settings = avatars[role].resetDebugSettings();
      bindings.forEach(({ input, key, value }) => {
        input.value = String(settings[key]);
        value.textContent = Number(input.value).toFixed(2);
      });
    });
    fieldset.appendChild(resetButton);
    panel.appendChild(fieldset);
  });

  parent.appendChild(panel);
  return panel;
}

function createLoadingOverlay() {
  const overlay = document.createElement("div");
  overlay.className = "game-loading-overlay";
  overlay.textContent = "LOADING";
  return overlay;
}

function createTemplateStage(variant: StageVariant = "plain") {
  const group = new THREE.Group();
  const stageSize = (GAME_BALANCE.arenaRadius - 0.75) * 2;
  const roomMaterial = new THREE.MeshStandardMaterial({
    color: NEU_COLORS.bg,
    roughness: 0.78,
    metalness: 0
  });

  const floor = new THREE.Mesh(
    new THREE.BoxGeometry(stageSize, 0.14, stageSize),
    roomMaterial.clone()
  );
  floor.position.y = -0.04;
  floor.receiveShadow = true;
  floor.castShadow = true;
  group.add(floor);

  const softPlate = new THREE.Mesh(
    new THREE.BoxGeometry(stageSize * 0.88, 0.035, stageSize * 0.88),
    roomMaterial.clone()
  );
  softPlate.position.y = 0.045;
  softPlate.receiveShadow = true;
  group.add(softPlate);

  addStageWalls(group, variant);

  return group;
}

function addStageWalls(group: THREE.Group, variant: StageVariant) {
  const wallMaterial = new THREE.MeshStandardMaterial({
    color: NEU_COLORS.bgInner,
    roughness: 0.82,
    metalness: 0
  });

  getStageWalls(variant).forEach((wall) => {
    const wallMesh = new THREE.Mesh(
      new THREE.BoxGeometry(wall.width, 1.18, wall.height),
      wallMaterial.clone()
    );
    wallMesh.position.set(wall.x, 0.6, wall.y);
    wallMesh.castShadow = true;
    wallMesh.receiveShadow = true;
    group.add(wallMesh);

    const wallTop = new THREE.Mesh(
      new THREE.BoxGeometry(wall.width + 0.06, 0.08, wall.height + 0.06),
      wallMaterial.clone()
    );
    wallTop.position.set(wall.x, 1.22, wall.y);
    wallTop.castShadow = true;
    wallTop.receiveShadow = true;
    group.add(wallTop);
  });
}

function createTextSprite(text: string, color: number) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 192;
  const context = canvas.getContext("2d");

  if (context) {
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = `#${color.toString(16).padStart(6, "0")}`;
    context.shadowColor = "rgba(174, 174, 192, 0.42)";
    context.shadowBlur = 7;
    context.shadowOffsetX = 4;
    context.shadowOffsetY = 5;
    context.font = "900 62px Space Grotesk, Arial, Helvetica, sans-serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(text, canvas.width / 2, canvas.height / 2);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: texture,
      transparent: true
    })
  );
  sprite.scale.set(3.2, 1.2, 1);
  return sprite;
}

function createKissProjectileSprite() {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const context = canvas.getContext("2d");

  if (context) {
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.font = "180px Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText("💋", canvas.width / 2, canvas.height / 2 + 4);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;

  const material = new THREE.SpriteMaterial({
    map: texture,
    opacity: 0,
    transparent: true,
    depthTest: false,
    depthWrite: false
  });
  const sprite = new THREE.Sprite(material);
  sprite.renderOrder = 10;
  sprite.scale.set(0.01, 0.01, 1);
  return sprite;
}

function createDynamicTextSprite(text: string, color: number, scale: number): DynamicTextSprite {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 192;
  const context = canvas.getContext("2d");
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: texture,
      transparent: true
    })
  );
  sprite.scale.set(3.4 * scale, 1.28 * scale, 1);

  const draw = (nextText: string) => {
    if (!context) {
      return;
    }

    context.clearRect(0, 0, canvas.width, canvas.height);
    context.strokeStyle = NEU_COLOR_STRINGS.white;
    context.fillStyle = `#${color.toString(16).padStart(6, "0")}`;
    context.lineWidth = 18;
    context.lineJoin = "round";
    context.font = "900 64px Arial, Helvetica, sans-serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.strokeText(nextText, canvas.width / 2, canvas.height / 2);
    context.fillText(nextText, canvas.width / 2, canvas.height / 2);
    texture.needsUpdate = true;
  };

  draw(text);

  return {
    sprite,
    setText: draw
  };
}

function getWantsAction(input: ThreeInputController) {
  return input.state.pointerDown || input.state.joystickActive || input.state.keys.space;
}

function getInputDirection(input: ThreeInputController, actor: THREE.Group): Vector2 {
  const direction = new THREE.Vector3(
    Number(input.state.keys.right) - Number(input.state.keys.left),
    0,
    Number(input.state.keys.down) - Number(input.state.keys.up)
  );

  if (input.state.joystickActive) {
    if (isForcedLandscapeView()) {
      direction.set(input.state.joystickY, 0, -input.state.joystickX);
    } else {
      direction.set(input.state.joystickX, 0, input.state.joystickY);
    }
  } else if (input.state.pointerDown) {
    const targetPoint = new THREE.Vector3(
      input.state.pointerX * GAME_BALANCE.arenaRadius * 0.86,
      0,
      -input.state.pointerY * GAME_BALANCE.arenaRadius * 0.52
    );
    direction.copy(targetPoint.sub(actor.position));
  }

  if (direction.length() <= GAME_BALANCE.pointerMoveDeadZone) {
    return { x: 0, y: 0 };
  }

  direction.normalize();

  return {
    x: direction.x,
    y: direction.z
  };
}

function resetActors(avatars: Record<PlayerRole, ChuAvatar>) {
  avatars.tagger.root.position.set(-2.4, 0, 0);
  avatars.tagger.root.rotation.set(0, 0, 0);
  avatars.runner.root.position.set(2.4, 0, -0.35);
  avatars.runner.root.rotation.set(0, 0, 0);
}

function updatePlayer(root: THREE.Group, input: ThreeInputController, delta: number) {
  const direction = new THREE.Vector3(
    Number(input.state.keys.right) - Number(input.state.keys.left),
    0,
    Number(input.state.keys.down) - Number(input.state.keys.up)
  );

  if (input.state.joystickActive) {
    if (isForcedLandscapeView()) {
      direction.set(input.state.joystickY, 0, -input.state.joystickX);
    } else {
      direction.set(input.state.joystickX, 0, input.state.joystickY);
    }
  } else if (input.state.pointerDown) {
    const targetPoint = new THREE.Vector3(
      input.state.pointerX * GAME_BALANCE.arenaRadius * 0.86,
      0,
      -input.state.pointerY * GAME_BALANCE.arenaRadius * 0.52
    );
    direction.copy(targetPoint.sub(root.position));
  }

  if (direction.length() > GAME_BALANCE.pointerMoveDeadZone) {
    direction.normalize();
    root.position.addScaledVector(direction, GAME_BALANCE.playerSpeed * delta);
    root.quaternion.slerp(
      new THREE.Quaternion().setFromUnitVectors(WORLD_FORWARD, direction),
      0.24
    );
  }

  keepInsideArena(root.position);
}

function updateTarget(root: THREE.Group, elapsed: number) {
  root.position.x = 2.35 + Math.sin(elapsed * 0.9) * 0.42;
  root.position.z = -0.35 + Math.cos(elapsed * 0.75) * 0.36;
  root.rotation.y = Math.sin(elapsed * 1.4) * 0.28;
}

function updateReadyDropIntro(
  avatars: Record<PlayerRole, ChuAvatar>,
  intro: { elapsed: number; isActive: boolean; startedAt: number }
) {
  if (!intro.isActive) {
    avatars.tagger.root.visible = true;
    avatars.runner.root.visible = true;
    avatars.tagger.root.scale.setScalar(1);
    avatars.runner.root.scale.setScalar(1);
    return;
  }

  const introElapsed = Math.max(0, intro.elapsed - intro.startedAt);
  const dropProgress = clamp(introElapsed / 0.78, 0, 1);
  const turnProgress = easeOutBack(clamp((introElapsed - 0.92) / 0.62, 0, 1));
  const eased = easeOutBounce(dropProgress);
  const dropOffset = (1 - eased) * 5.6;
  const squash = dropProgress > 0.72 ? Math.sin((dropProgress - 0.72) * Math.PI * 3.2) * 0.045 : 0;
  const facingAngle = Math.PI * (1 - turnProgress);

  avatars.tagger.root.visible = dropProgress > 0.04;
  avatars.runner.root.visible = dropProgress > 0.04;
  avatars.tagger.root.position.y += dropOffset;
  avatars.runner.root.position.y += dropOffset;
  avatars.tagger.root.rotation.y = facingAngle;
  avatars.runner.root.rotation.y = facingAngle;
  if (dropProgress >= 1) {
    avatars.tagger.root.scale.setScalar(1);
    avatars.runner.root.scale.setScalar(1);
  } else {
    avatars.tagger.root.scale.set(1 + squash, 1 - squash, 1 + squash);
    avatars.runner.root.scale.set(1 + squash, 1 - squash, 1 + squash);
  }
}

function easeOutBack(value: number) {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(value - 1, 3) + c1 * Math.pow(value - 1, 2);
}

function playReadyIntroDrumroll() {
  try {
    const AudioContextConstructor =
      window.AudioContext ??
      (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextConstructor) {
      return;
    }
    const audioContext = new AudioContextConstructor();
    const startAt = audioContext.currentTime + 0.02;
    const duration = 1.18;
    const masterGain = audioContext.createGain();
    masterGain.gain.setValueAtTime(0.0001, startAt);
    masterGain.gain.exponentialRampToValueAtTime(0.12, startAt + 0.04);
    masterGain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
    masterGain.connect(audioContext.destination);

    for (let index = 0; index < 14; index += 1) {
      const pulseAt = startAt + index * 0.075;
      const oscillator = audioContext.createOscillator();
      const pulseGain = audioContext.createGain();
      oscillator.type = "sawtooth";
      oscillator.frequency.setValueAtTime(74 + Math.sin(index * 0.7) * 9, pulseAt);
      pulseGain.gain.setValueAtTime(0.0001, pulseAt);
      pulseGain.gain.exponentialRampToValueAtTime(0.32, pulseAt + 0.012);
      pulseGain.gain.exponentialRampToValueAtTime(0.0001, pulseAt + 0.058);
      oscillator.connect(pulseGain).connect(masterGain);
      oscillator.start(pulseAt);
      oscillator.stop(pulseAt + 0.07);
    }

    const revealAt = startAt + 1.12;
    const revealOscillator = audioContext.createOscillator();
    const revealGain = audioContext.createGain();
    revealOscillator.type = "triangle";
    revealOscillator.frequency.setValueAtTime(220, revealAt);
    revealOscillator.frequency.exponentialRampToValueAtTime(440, revealAt + 0.11);
    revealGain.gain.setValueAtTime(0.0001, revealAt);
    revealGain.gain.exponentialRampToValueAtTime(0.22, revealAt + 0.018);
    revealGain.gain.exponentialRampToValueAtTime(0.0001, revealAt + 0.22);
    revealOscillator.connect(revealGain).connect(masterGain);
    revealOscillator.start(revealAt);
    revealOscillator.stop(revealAt + 0.24);
  } catch {
    // Some mobile browsers block audio until the next user gesture.
  }
}

function easeOutBounce(value: number) {
  const n1 = 7.5625;
  const d1 = 2.75;

  if (value < 1 / d1) {
    return n1 * value * value;
  }

  if (value < 2 / d1) {
    const shifted = value - 1.5 / d1;
    return n1 * shifted * shifted + 0.75;
  }

  if (value < 2.5 / d1) {
    const shifted = value - 2.25 / d1;
    return n1 * shifted * shifted + 0.9375;
  }

  const shifted = value - 2.625 / d1;
  return n1 * shifted * shifted + 0.984375;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function createChuserLockCapsule() {
  const group = new THREE.Group();
  group.visible = false;

  const capsuleMaterial = new THREE.MeshStandardMaterial({
    color: NEU_COLORS.blueGray300,
    opacity: 0.28,
    roughness: 0.18,
    metalness: 0,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide
  });
  const shell = new THREE.Mesh(new THREE.CapsuleGeometry(0.95, 1.46, 12, 32), capsuleMaterial);
  shell.position.y = 1.18;
  shell.castShadow = false;
  shell.receiveShadow = false;

  const ringMaterial = new THREE.MeshStandardMaterial({
    color: NEU_COLORS.blueGray400,
    opacity: 0.42,
    roughness: 0.34,
    transparent: true,
    depthWrite: false
  });
  const baseRing = new THREE.Mesh(new THREE.TorusGeometry(0.98, 0.035, 10, 48), ringMaterial);
  baseRing.rotation.x = Math.PI / 2;
  baseRing.position.y = 0.2;
  const topRing = baseRing.clone();
  topRing.position.y = 2.16;

  const lockBandMaterial = new THREE.MeshStandardMaterial({
    color: NEU_COLORS.blueGray400,
    opacity: 0.5,
    roughness: 0.4,
    transparent: true,
    depthWrite: false
  });
  const lockBandGeometry = new THREE.BoxGeometry(1.72, 0.08, 0.05);
  const upperBand = new THREE.Mesh(lockBandGeometry, lockBandMaterial);
  upperBand.position.set(0, 1.52, 0.88);
  upperBand.rotation.z = THREE.MathUtils.degToRad(14);
  const lowerBand = upperBand.clone();
  lowerBand.position.y = 1.02;
  lowerBand.rotation.z = THREE.MathUtils.degToRad(-14);

  shell.userData.baseOpacity = 0.28;
  baseRing.userData.baseOpacity = 0.42;
  topRing.userData.baseOpacity = 0.42;
  upperBand.userData.baseOpacity = 0.5;
  lowerBand.userData.baseOpacity = 0.5;

  group.add(shell, baseRing, topRing, upperBand, lowerBand);
  return group;
}

function updateChuserLockCapsule(
  capsule: THREE.Group,
  state: { elapsed: number; isLocked: boolean; releaseProgress: number }
) {
  const isReleasing = !state.isLocked && state.releaseProgress < 1;
  capsule.visible = state.isLocked || isReleasing;

  if (!capsule.visible) {
    return;
  }

  if (isReleasing) {
    const release = easeOutBack(state.releaseProgress);
    const fade = 1 - state.releaseProgress;
    setChuserLockCapsuleOpacity(capsule, fade);
    capsule.scale.set(1 + release * 1.1, 1 + release * 0.36, 1 + release * 1.1);
    capsule.rotation.y = state.elapsed * 1.7;
    return;
  }

  setChuserLockCapsuleOpacity(capsule, 1);
  const pulse = 1 + Math.sin(state.elapsed * 6.8) * 0.04;
  capsule.scale.set(pulse, 1 + Math.sin(state.elapsed * 5.4) * 0.018, pulse);
  capsule.rotation.y = Math.sin(state.elapsed * 1.2) * 0.12;
}

function setChuserLockCapsuleOpacity(capsule: THREE.Group, opacityScale: number) {
  capsule.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) {
      return;
    }

    const materials = Array.isArray(child.material) ? child.material : [child.material];
    const baseOpacity =
      typeof child.userData.baseOpacity === "number"
        ? child.userData.baseOpacity
        : child.geometry instanceof THREE.TorusGeometry
          ? 0.42
          : 0.28;
    materials.forEach((material) => {
      if ("opacity" in material && typeof material.opacity === "number") {
        material.opacity = baseOpacity * opacityScale;
        material.needsUpdate = true;
      }
    });
  });
}

function updateAvatars(
  avatars: Record<PlayerRole, ChuAvatar>,
  elapsed: number,
  contactPulse: number,
  isCaptureActive: boolean,
  runAmounts: Record<PlayerRole, number>
) {
  avatars.tagger.setCaptureActive(isCaptureActive);
  avatars.runner.setCaptureActive(isCaptureActive);
  avatars.tagger.update(elapsed, contactPulse, runAmounts.tagger);
  avatars.runner.update(elapsed, contactPulse, runAmounts.runner);
}

function updateAvatarRunAmounts(
  avatars: Record<PlayerRole, ChuAvatar>,
  previousPositions: Record<PlayerRole, THREE.Vector3>,
  runAmounts: Record<PlayerRole, number>,
  delta: number
) {
  (["tagger", "runner"] as const).forEach((role) => {
    const position = avatars[role].root.position;
    const previous = previousPositions[role];
    const distance = Math.hypot(position.x - previous.x, position.z - previous.z);
    const speed = delta > 0 ? distance / delta : 0;
    const targetRunAmount = clamp(speed / GAME_BALANCE.playerSpeed, 0, 1);
    runAmounts[role] = THREE.MathUtils.lerp(runAmounts[role], targetRunAmount, 0.34);
    previous.copy(position);
  });
}

function updateFootstepSfx({
  elapsed,
  isCaptureActive,
  isPlaying,
  nextFootstepAt,
  runAmount,
  setNextFootstepAt
}: {
  elapsed: number;
  isCaptureActive: boolean;
  isPlaying: boolean;
  nextFootstepAt: number;
  runAmount: number;
  setNextFootstepAt: (value: number) => void;
}) {
  if (!isPlaying || isCaptureActive || runAmount < 0.42) {
    return;
  }

  if (elapsed < nextFootstepAt) {
    return;
  }

  playFootstepSfx(runAmount);
  setNextFootstepAt(elapsed + THREE.MathUtils.lerp(0.34, 0.22, runAmount));
}

function updateContactText(
  sprite: THREE.Sprite,
  runnerPosition: THREE.Vector3,
  contactPulse: number,
  isCaptureActive: boolean,
  captureProgress: number
) {
  sprite.visible = contactPulse > 0 || isCaptureActive;
  if (!sprite.visible) {
    return;
  }

  const pop = isCaptureActive ? easeOutBack(clamp(captureProgress / 0.36, 0, 1)) : contactPulse;
  const hang = isCaptureActive ? 1 - clamp((captureProgress - 0.52) / 0.48, 0, 1) : contactPulse;
  const bounce = Math.sin(captureProgress * Math.PI * 3) * 0.16 * hang;
  const baseScale = 1.2 + pop * 0.78;

  sprite.position.copy(runnerPosition);
  sprite.position.y = 2.9 + pop * 0.42 + bounce;
  sprite.position.x += Math.sin(captureProgress * Math.PI * 2) * 0.12 * hang;
  sprite.rotation.z = -THREE.MathUtils.degToRad(40);
  sprite.scale.set(3.2 * baseScale, 1.2 * baseScale, 1);
}

function updateKissProjectile(
  sprite: THREE.Sprite,
  runnerPosition: THREE.Vector3,
  isCaptureActive: boolean,
  captureProgress: number
) {
  sprite.visible = isCaptureActive;
  const material = sprite.material as THREE.SpriteMaterial;

  if (!isCaptureActive) {
    material.opacity = 0;
    return;
  }

  const launch = easeOutBack(clamp(captureProgress / 0.72, 0, 1));
  const exit = clamp((captureProgress - 0.5) / 0.5, 0, 1);
  const fade = 1 - clamp((captureProgress - 0.86) / 0.14, 0, 1);
  const wobble = Math.sin(captureProgress * Math.PI * 5.2);
  const scale = 0.12 + launch * 2.2 + exit * 3.2;

  material.opacity = Math.min(1, fade * 1.08);
  sprite.position.copy(runnerPosition);
  sprite.position.y = 2.36 + launch * 0.76 + exit * 0.92 + wobble * 0.05 * fade;
  sprite.position.x += -0.16 + launch * 0.1 + exit * 0.18;
  sprite.position.z += 0.06 + launch * 1.2 + exit * 2.7;
  sprite.rotation.z = -0.16 + wobble * 0.12 * fade;
  sprite.scale.set(1.5 * scale, 1.5 * scale, 1);
}

function keepInsideArena(position: THREE.Vector3) {
  const limit = GAME_BALANCE.arenaRadius - 0.75;
  position.x = clamp(position.x, -limit, limit);
  position.z = clamp(position.z, -limit, limit);
}

function disposeObject(object: THREE.Object3D) {
  object.traverse((child) => {
    if (child instanceof THREE.Mesh || child instanceof THREE.Sprite) {
      child.geometry?.dispose();
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      materials.forEach((material) => {
        const maybeTexture = material as THREE.Material & { map?: THREE.Texture };
        maybeTexture.map?.dispose();
        material.dispose();
      });
    }
  });
}
