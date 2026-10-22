export const X_MIN = -5;
export const X_MAX = 5;
export const Y_MIN = 0;
export const Y_MAX = 10;

export type Rect = { left: number; top: number; width: number; height: number };

export const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
export const round1 = (n: number) => Math.round(n * 10) / 10;

export function clampCoords(x: number, y: number) {
  return { x: round1(clamp(x, X_MIN, X_MAX)), y: round1(clamp(y, Y_MIN, Y_MAX)) };
}

/** Viewport pixel position -> map coordinates, given the plot's bounding rect. */
export function pxToCoords(px: number, py: number, rect: Rect) {
  const fx = (px - rect.left) / rect.width;
  const fy = (py - rect.top) / rect.height;
  return clampCoords(X_MIN + fx * (X_MAX - X_MIN), Y_MAX - fy * (Y_MAX - Y_MIN));
}

/** Map coordinates -> percentage offsets from the plot's top-left corner. */
export function coordsToPercent(x: number, y: number) {
  return {
    left: ((x - X_MIN) / (X_MAX - X_MIN)) * 100,
    top: ((Y_MAX - y) / (Y_MAX - Y_MIN)) * 100,
  };
}

/** Existing coordinates moved by a pixel drag delta. */
export function deltaToCoords(x: number, y: number, dx: number, dy: number, width: number, height: number) {
  return clampCoords(x + (dx / width) * (X_MAX - X_MIN), y - (dy / height) * (Y_MAX - Y_MIN));
}
