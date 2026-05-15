import type { Vector2 } from "@/shared/protocol";

export function distanceBetween(a: Vector2, b: Vector2) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function normalizeVector(vector: Vector2): Vector2 {
  const length = Math.hypot(vector.x, vector.y);

  if (length <= 0) {
    return { x: 0, y: 0 };
  }

  return {
    x: vector.x / length,
    y: vector.y / length
  };
}

export function clampToBounds(position: Vector2, width: number, height: number): Vector2 {
  return {
    x: Math.max(0, Math.min(width, position.x)),
    y: Math.max(0, Math.min(height, position.y))
  };
}
