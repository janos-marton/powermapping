import { describe, expect, it } from "vitest";
import { clampCoords, coordsToPercent, deltaToCoords, pxToCoords } from "./geometry";

const rect = { left: 100, top: 50, width: 1000, height: 500 };

describe("geometry", () => {
  it("maps plot corners and center", () => {
    expect(pxToCoords(100, 50, rect)).toEqual({ x: -5, y: 10 });
    expect(pxToCoords(1100, 550, rect)).toEqual({ x: 5, y: 0 });
    expect(pxToCoords(600, 300, rect)).toEqual({ x: 0, y: 5 });
  });
  it("clamps points outside the plot and rounds to 0.1", () => {
    expect(pxToCoords(-500, 9999, rect)).toEqual({ x: -5, y: 0 });
    expect(clampCoords(1.234, 7.777)).toEqual({ x: 1.2, y: 7.8 });
  });
  it("round-trips through percentages", () => {
    expect(coordsToPercent(0, 5)).toEqual({ left: 50, top: 50 });
    expect(coordsToPercent(-5, 10)).toEqual({ left: 0, top: 0 });
  });
  it("applies drag deltas in the right direction", () => {
    // 100px right = +1 on X; 50px down = -1 on Y
    expect(deltaToCoords(0, 5, 100, 50, 1000, 500)).toEqual({ x: 1, y: 4 });
  });
});
