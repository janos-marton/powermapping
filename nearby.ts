export const NEARBY_RANGE = 1.5;
export const NEARBY_MAX = 3;

export type Placed = { id: string; name: string; x: number; y: number };

export type Nearby = {
  /** Within ±1.5 on power (Y), nearest first. */
  similarPower: Placed[];
  /** Within ±1.5 on support (X), nearest first. */
  similarSupport: Placed[];
};

/**
 * Computed in code, not by Claude, so the follow-up question can only cite real actors.
 * An actor may appear in both lists. Ties are broken by name for stable output.
 */
export function computeNearby(subject: Placed, others: Placed[]): Nearby {
  const pool = others.filter((o) => o.id !== subject.id);
  const pick = (dist: (o: Placed) => number) =>
    pool
      .filter((o) => dist(o) <= NEARBY_RANGE + 1e-9)
      .sort((a, b) => dist(a) - dist(b) || a.name.localeCompare(b.name))
      .slice(0, NEARBY_MAX);
  return {
    similarPower: pick((o) => Math.abs(o.y - subject.y)),
    similarSupport: pick((o) => Math.abs(o.x - subject.x)),
  };
}
