import type { Actor, ChatMessage } from "@prisma/client";
import type { ActorDTO, ChatMessageDTO } from "./types";

function parseRationale(raw: string | null): ActorDTO["claudeRationale"] {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw);
    return { power: String(v.power ?? ""), support: String(v.support ?? "") };
  } catch {
    return null;
  }
}

export function toActorDTO(a: Actor): ActorDTO {
  return {
    id: a.id,
    name: a.name,
    type: a.type,
    affiliation: a.affiliation,
    description: a.description,
    currentHolder: a.currentHolder,
    x: a.x,
    y: a.y,
    placedBySource: a.placedBySource === "claude" || a.placedBySource === "user" ? a.placedBySource : null,
    placedByUser: a.placedByUser,
    placedAt: a.placedAt?.toISOString() ?? null,
    claudeRationale: parseRationale(a.claudeRationale),
    claudeConfidence: (a.claudeConfidence as ActorDTO["claudeConfidence"]) ?? null,
  };
}

export function toMessageDTO(m: ChatMessage): ChatMessageDTO {
  return {
    id: m.id,
    role: m.role as ChatMessageDTO["role"],
    userName: m.userName,
    body: m.body,
    relatedActorId: m.relatedActorId,
    createdAt: m.createdAt.toISOString(),
  };
}
