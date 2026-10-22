import { db } from "./db";
import { formatPos } from "./format";
import { clampCoords } from "./geometry";
import { HttpError } from "./http";
import type { PreviousPlacement } from "./types";

export type PlacementInput = {
  actorId: string;
  source: "user" | "claude";
  userName: string; // "Claude" for Claude placements
  /** null x/y removes the actor from the map */
  x: number | null;
  y: number | null;
  rationale?: string; // stored on the history event
  confidence?: string;
  claudeRationale?: { power: string; support: string }; // stored on the actor for chat to cite
};

/**
 * The one write path for placements (drag, unplace, and Claude): updates the actor, appends a
 * PlacementEvent, and, for user actions, posts a system_event to chat. The chat event is posted
 * regardless of the user's follow-up toggle; the toggle only gates Claude's question.
 */
export async function applyPlacement(input: PlacementInput) {
  return db.$transaction(async (tx) => {
    const actor = await tx.actor.findUnique({ where: { id: input.actorId } });
    if (!actor) throw new HttpError(404, "Actor not found");

    const hadPlacement = actor.x !== null && actor.y !== null;
    const placing = input.x !== null && input.y !== null;
    if (!placing && !hadPlacement) return { actor, previous: null as PreviousPlacement, changed: false };

    const next = placing ? clampCoords(input.x as number, input.y as number) : null;
    const previous: PreviousPlacement = hadPlacement
      ? {
          by: actor.placedBySource === "claude" ? "Claude" : (actor.placedByUser ?? "a colleague"),
          source: actor.placedBySource === "claude" ? "claude" : "user",
          x: actor.x as number,
          y: actor.y as number,
        }
      : null;

    await tx.placementEvent.create({
      data: {
        actorId: actor.id,
        fromX: actor.x,
        fromY: actor.y,
        toX: next?.x ?? null,
        toY: next?.y ?? null,
        source: input.source,
        userName: input.userName,
        rationale: input.rationale ?? null,
        confidence: input.confidence ?? null,
      },
    });

    const updated = await tx.actor.update({
      where: { id: actor.id },
      data: next
        ? {
            x: next.x,
            y: next.y,
            placedBySource: input.source,
            placedByUser: input.userName,
            placedAt: new Date(),
            claudeRationale: input.claudeRationale ? JSON.stringify(input.claudeRationale) : null,
            claudeConfidence: input.source === "claude" ? (input.confidence ?? null) : null,
          }
        : {
            x: null,
            y: null,
            placedBySource: null,
            placedByUser: null,
            placedAt: null,
            claudeRationale: null,
            claudeConfidence: null,
          },
    });

    if (input.source === "user") {
      const body = !next
        ? `${input.userName} removed ${actor.name} from the map`
        : previous
          ? `${input.userName} moved ${actor.name} from ${formatPos(previous.x, previous.y)} to ${formatPos(next.x, next.y)}`
          : `${input.userName} placed ${actor.name} at ${formatPos(next.x, next.y)}`;
      await tx.chatMessage.create({
        data: { mapId: actor.mapId, role: "system_event", userName: input.userName, body, relatedActorId: actor.id },
      });
    }

    return { actor: updated, previous, changed: true };
  });
}
