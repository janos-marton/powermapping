export type ActorDTO = {
  id: string;
  name: string;
  type: string;
  affiliation: string;
  description: string;
  currentHolder: string | null;
  x: number | null;
  y: number | null;
  placedBySource: "user" | "claude" | null;
  placedByUser: string | null;
  placedAt: string | null;
  claudeRationale: { power: string; support: string } | null;
  claudeConfidence: "low" | "medium" | "high" | null;
};

export type ChatMessageDTO = {
  id: string;
  role: "user" | "assistant" | "system_event";
  userName: string | null;
  body: string;
  relatedActorId: string | null;
  createdAt: string;
};

export type MapState = {
  map: { id: string; jurisdiction: string; issue: string };
  actors: ActorDTO[];
  messages: ChatMessageDTO[];
  settings: { claudeFollowUps: boolean };
  userName: string;
};

/** Who placed the actor before this move; the client uses it for the "previously placed by" nudge. */
export type PreviousPlacement = { by: string; source: "user" | "claude"; x: number; y: number } | null;

export type PlacementEventDTO = {
  id: string;
  fromX: number | null;
  fromY: number | null;
  toX: number | null;
  toY: number | null;
  source: "user" | "claude";
  userName: string;
  rationale: string | null;
  confidence: string | null;
  createdAt: string;
};

export type NoteDTO = { id: string; userName: string; body: string; createdAt: string };
