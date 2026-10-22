import { describe, expect, it } from "vitest";
import { computeNearby, type Placed } from "./nearby";

const p = (id: string, x: number, y: number): Placed => ({ id, name: id.toUpperCase(), x, y });

describe("computeNearby", () => {
  const subject = p("me", 2, 6);

  it("finds actors within ±1.5 on each axis, nearest first, excluding the subject", () => {
    const others = [subject, p("a", -4, 6.5), p("b", 0.6, 9), p("c", 3, 5), p("d", 2.4, 6.1), p("far", -5, 0)];
    const n = computeNearby(subject, others);
    expect(n.similarPower.map((o) => o.id)).toEqual(["d", "a", "c"]); // dy 0.1, 0.5, 1.0
    expect(n.similarSupport.map((o) => o.id)).toEqual(["d", "c", "b"]); // dx 0.4, 1.0, 1.4
  });

  it("includes the exact boundary and excludes just beyond it", () => {
    const n = computeNearby(subject, [p("edge", 0.5, 7.5), p("out", 0.4, 7.6)]);
    expect(n.similarPower.map((o) => o.id)).toEqual(["edge"]);
    expect(n.similarSupport.map((o) => o.id)).toEqual(["edge"]);
  });

  it("caps each list at three", () => {
    const others = [1, 2, 3, 4, 5].map((i) => p(`n${i}`, 2 + i * 0.1, 6 + i * 0.1));
    const n = computeNearby(subject, others);
    expect(n.similarPower).toHaveLength(3);
    expect(n.similarSupport).toHaveLength(3);
  });

  it("returns empty lists when nothing is nearby", () => {
    expect(computeNearby(subject, [p("x", -5, 0)])).toEqual({ similarPower: [], similarSupport: [] });
    expect(computeNearby(subject, [])).toEqual({ similarPower: [], similarSupport: [] });
  });
});
