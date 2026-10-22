import { initials } from "@/lib/actorTypes";
import type { ActorDTO } from "@/lib/types";

/** Marks who placed an actor: a Claude badge, or the placing user's initials. */
export function PlacerBadge({ actor }: { actor: ActorDTO }) {
  if (actor.placedBySource === "claude") {
    return (
      <span title="Placed by Claude" className="rounded bg-violet-600 px-1 text-[9px] font-semibold leading-4 text-white">
        Claude
      </span>
    );
  }
  if (actor.placedByUser) {
    return (
      <span
        title={`Placed by ${actor.placedByUser}`}
        className="rounded-full bg-slate-700 px-1.5 text-[9px] font-semibold leading-4 text-white"
      >
        {initials(actor.placedByUser)}
      </span>
    );
  }
  return null;
}
