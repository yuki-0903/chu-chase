import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { NEU_COLORS } from "@/game/config/neumorphismPalette";
import type { PlayerRole } from "@/shared/protocol";

export const AVATAR_TUNING = {
  modelUrls: {
    tagger: "/assets/models/oni.glb",
    runner: "/assets/models/runner.glb"
  },
  modelScale: {
    tagger: 1.15,
    runner: 1.15
  },
  captureScale: {
    tagger: new THREE.Vector3(1.34, 1.18, 1.52),
    runner: new THREE.Vector3(1.28, 0.58, 1.12)
  },
  shadowColor: NEU_COLORS.gray400,
  panicColor: NEU_COLORS.pink400
} as const;

export interface AvatarDebugSettings {
  scale: number;
  lightness: number;
  roughness: number;
  metalness: number;
  envMapIntensity: number;
}

export interface ChuAvatar {
  role: PlayerRole;
  root: THREE.Group;
  modelRoot: THREE.Group;
  getDebugSettings: () => AvatarDebugSettings;
  resetDebugSettings: () => AvatarDebugSettings;
  setDebugSettings: (settings: AvatarDebugSettings) => void;
  setCaptureActive: (active: boolean) => void;
  update: (elapsed: number, contactPulse: number, runAmount: number) => void;
}

const loader = new GLTFLoader();
const NORMAL_SCALE = new THREE.Vector3(1, 1, 1);
const AVATAR_LIGHT_COLOR = new THREE.Color(NEU_COLORS.white);
const AVATAR_DEBUG_STORAGE_PREFIX = "chu-chase-avatar-debug";
const DEFAULT_AVATAR_DEBUG: Record<PlayerRole, AvatarDebugSettings> = {
  tagger: {
    scale: AVATAR_TUNING.modelScale.tagger,
    lightness: 0,
    roughness: 0.48,
    metalness: 0,
    envMapIntensity: 0.55
  },
  runner: {
    scale: AVATAR_TUNING.modelScale.runner,
    lightness: 1,
    roughness: 0.76,
    metalness: 0,
    envMapIntensity: 0.18
  }
};

export function createOniAvatar(onLoaded?: () => void): ChuAvatar {
  return createGlbAvatar("tagger", onLoaded);
}

export function createRunnerAvatar(onLoaded?: () => void): ChuAvatar {
  return createGlbAvatar("runner", onLoaded);
}

function createGlbAvatar(role: PlayerRole, onLoaded?: () => void): ChuAvatar {
  const root = new THREE.Group();
  const modelRoot = new THREE.Group();
  const loadingShadow = createLoadingShadow();
  const panicIcon = role === "runner" ? createPanicIcon() : null;
  let debugSettings = loadAvatarDebugSettings(role);
  let isCaptureActive = false;
  let loadedModel: THREE.Object3D | null = null;

  applyModelScale(modelRoot, role, debugSettings, NORMAL_SCALE);
  root.add(modelRoot, loadingShadow);

  if (panicIcon) {
    panicIcon.visible = false;
    root.add(panicIcon);
  }

  loader.load(
    AVATAR_TUNING.modelUrls[role],
    (gltf) => {
      const model = gltf.scene;
      normalizeModel(model, role);
      loadedModel = model;
      applyAvatarDebugSettings(model, debugSettings);
      modelRoot.add(model);
      loadingShadow.visible = false;
      onLoaded?.();
    },
    undefined,
    () => {
      loadingShadow.visible = true;
      onLoaded?.();
    }
  );

  return {
    role,
    root,
    modelRoot,
    getDebugSettings() {
      return { ...debugSettings };
    },
    resetDebugSettings() {
      debugSettings = { ...DEFAULT_AVATAR_DEBUG[role] };
      saveAvatarDebugSettings(role, debugSettings);
      applyModelScale(modelRoot, role, debugSettings, isCaptureActive ? AVATAR_TUNING.captureScale[role] : NORMAL_SCALE);
      if (loadedModel) {
        applyAvatarDebugSettings(loadedModel, debugSettings);
      }
      return { ...debugSettings };
    },
    setDebugSettings(settings) {
      debugSettings = { ...settings };
      saveAvatarDebugSettings(role, debugSettings);
      applyModelScale(modelRoot, role, debugSettings, isCaptureActive ? AVATAR_TUNING.captureScale[role] : NORMAL_SCALE);
      if (loadedModel) {
        applyAvatarDebugSettings(loadedModel, debugSettings);
      }
    },
    setCaptureActive(active) {
      isCaptureActive = active;
      const targetScale = active ? AVATAR_TUNING.captureScale[role] : NORMAL_SCALE;
      const nextScale = getModelScaleVector(debugSettings.scale, targetScale);
      modelRoot.scale.lerp(nextScale, active ? 0.34 : 0.2);

      if (panicIcon) {
        panicIcon.visible = active;
      }
    },
    update(elapsed, contactPulse, runAmount) {
      const runPhase = elapsed * 13.5 + (role === "runner" ? 0.7 : 0);
      const idleBounce = Math.abs(Math.sin(elapsed * 5 + (role === "runner" ? 0.7 : 0))) * 0.028;
      const runBounce = Math.abs(Math.sin(runPhase)) * 0.13 * runAmount;
      const runSway = Math.sin(runPhase) * 0.1 * runAmount;
      const pulse = contactPulse > 0 ? Math.sin(elapsed * 34) * 0.055 : 0;
      const captureYOffset = role === "runner" ? -contactPulse * 0.12 : 0;

      root.position.y = idleBounce + runBounce;
      modelRoot.position.z = role === "tagger" ? contactPulse * 0.18 : 0;
      modelRoot.position.y = captureYOffset + runBounce * 0.22;
      modelRoot.rotation.x = -0.08 * runAmount;
      modelRoot.rotation.z = pulse + runSway;

      if (panicIcon) {
        panicIcon.position.y = 2.25 + Math.sin(elapsed * 7.4) * 0.08;
        panicIcon.rotation.y = Math.sin(elapsed * 5.5) * 0.28;
      }
    }
  };
}

function applyModelScale(
  modelRoot: THREE.Group,
  role: PlayerRole,
  settings: AvatarDebugSettings,
  targetScale: THREE.Vector3
) {
  modelRoot.scale.copy(getModelScaleVector(settings.scale || AVATAR_TUNING.modelScale[role], targetScale));
}

function getModelScaleVector(baseScale: number, targetScale: THREE.Vector3) {
  return new THREE.Vector3(
    targetScale.x * baseScale,
    targetScale.y * baseScale,
    targetScale.z * baseScale
  );
}

function applyAvatarDebugSettings(model: THREE.Object3D, settings: AvatarDebugSettings) {
  model.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      materials.forEach((material) => {
        if ("roughness" in material && typeof material.roughness === "number") {
          material.roughness = settings.roughness;
        }

        if ("color" in material && material.color instanceof THREE.Color) {
          const userData = material.userData as { chuBaseColor?: THREE.Color };
          if (!userData.chuBaseColor) {
            userData.chuBaseColor = material.color.clone();
          }

          material.color.copy(userData.chuBaseColor).lerp(AVATAR_LIGHT_COLOR, settings.lightness);
        }

        if ("emissive" in material && material.emissive instanceof THREE.Color) {
          material.emissive.copy(AVATAR_LIGHT_COLOR);
        }

        if ("emissiveIntensity" in material && typeof material.emissiveIntensity === "number") {
          material.emissiveIntensity = settings.lightness * 0.18;
        }

        if ("metalness" in material && typeof material.metalness === "number") {
          material.metalness = settings.metalness;
        }

        if ("envMapIntensity" in material && typeof material.envMapIntensity === "number") {
          material.envMapIntensity = settings.envMapIntensity;
        }

        material.needsUpdate = true;
      });
    }
  });
}

function loadAvatarDebugSettings(role: PlayerRole): AvatarDebugSettings {
  const defaults = DEFAULT_AVATAR_DEBUG[role];

  try {
    if (typeof window === "undefined") {
      return { ...defaults };
    }

    const saved = window.localStorage.getItem(getAvatarDebugStorageKey(role));
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

function saveAvatarDebugSettings(role: PlayerRole, settings: AvatarDebugSettings) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(getAvatarDebugStorageKey(role), JSON.stringify(settings));
}

function getAvatarDebugStorageKey(role: PlayerRole) {
  return `${AVATAR_DEBUG_STORAGE_PREFIX}-${role}`;
}

function normalizeModel(model: THREE.Object3D, role: PlayerRole) {
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const maxDimension = Math.max(size.x, size.y, size.z) || 1;
  const scale = 1.8 / maxDimension;

  model.scale.setScalar(scale);
  model.position.set(-center.x * scale, -center.y * scale + size.y * scale * 0.5, -center.z * scale);

  model.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.castShadow = true;
      child.receiveShadow = true;
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      materials.forEach((material) => {
        if ("roughness" in material && typeof material.roughness === "number") {
          material.roughness = Math.max(material.roughness, role === "runner" ? 0.76 : 0.48);
        }

        if (role === "runner") {
          if ("metalness" in material && typeof material.metalness === "number") {
            material.metalness = 0;
          }

          if ("envMapIntensity" in material && typeof material.envMapIntensity === "number") {
            material.envMapIntensity = Math.min(material.envMapIntensity, 0.18);
          }
        }

        material.needsUpdate = true;
      });
    }
  });
}

function createLoadingShadow() {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.62, 28, 18),
    new THREE.MeshStandardMaterial({
      color: NEU_COLORS.gray200,
      roughness: 0.74
    })
  );
  mesh.scale.set(0.86, 1.12, 0.68);
  mesh.position.y = 0.88;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function createPanicIcon() {
  const icon = new THREE.Group();
  icon.position.set(0.3, 2.25, 0.1);

  const markMaterial = new THREE.MeshStandardMaterial({
    color: AVATAR_TUNING.panicColor,
    roughness: 0.32
  });
  const dot = new THREE.Mesh(new THREE.SphereGeometry(0.055, 12, 8), markMaterial);
  const stem = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.28, 0.05), markMaterial.clone());
  stem.position.y = 0.18;
  dot.position.y = -0.06;
  icon.add(stem, dot);
  return icon;
}
