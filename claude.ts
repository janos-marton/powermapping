import Anthropic from "@anthropic-ai/sdk";
import { config } from "./config";
import { getContextProvider } from "./context";
import { HttpError } from "./http";
import type { Nearby } from "./nearby";
import {
  CHAT_SYSTEM,
  FOLLOWUP_SYSTEM,
  PLACEMENT_SYSTEM,
  chatUserPrompt,
  compactMapState,
  focusBlock,
  followUpUserPrompt,
  placementUserPrompt,
  toChatTurns,
  type FocusData,
  type PlacementTarget,
} from "./prompts";
import { parsePlacements, type PlacementItem } from "./placementSchema";
import type { ActorDTO } from "./types";

/**
 * The only module that talks to the Anthropic API. Every call goes through `callClaude`, which
 * applies prompt caching to the static system prompt, enforces max_tokens, and logs token usage.
 * The API key comes from ANTHROPIC_API_KEY on the server and is never sent to the client.
 */

export type Purpose = "placement" | "chat" | "followup";

let override: Anthropic | null = null;
let cached: Anthropic | null = null;

/** Test hook: lets unit tests inject a fake client. */
export function setClientForTests(client: Anthropic | null) {
  override = client;
}

function getClient(): Anthropic {
  if (override) return override;
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new HttpError(503, "ANTHROPIC_API_KEY is not set on the server. Add it to .env and restart.");
  }
  // Reads ANTHROPIC_API_KEY (and ANTHROPIC_BASE_URL) from the environment. Keys that aren't scoped to a
  // workspace need the workspace id sent as a header.
  const workspaceId = process.env.ANTHROPIC_WORKSPACE_ID;
  return (cached ??= new Anthropic(workspaceId ? { defaultHeaders: { "anthropic-workspace-id": workspaceId } } : {}));
}

type CallOptions = {
  purpose: Purpose;
  model: string;
  system: string;
  messages: Anthropic.MessageParam[];
  maxTokens: number;
  /** Placement keeps Claude's default adaptive thinking; short chat turns turn it off so max_tokens goes to the answer. */
  thinking?: "default" | "disabled";
  effort?: "low" | "medium" | "high";
};

export type CallResult = { text: string; stopReason: string | null };

export async function callClaude(opts: CallOptions): Promise<CallResult> {
  const client = getClient();
  let response: Anthropic.Message;
  try {
    response = await client.messages.create({
      model: opts.model,
      max_tokens: opts.maxTokens,
      system: [{ type: "text", text: opts.system, cache_control: { type: "ephemeral" } }],
      messages: opts.messages,
      ...(opts.thinking === "disabled" ? { thinking: { type: "disabled" as const } } : {}),
      ...(opts.effort ? { output_config: { effort: opts.effort } } : {}),
    });
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) throw new HttpError(502, "Anthropic rejected the API key");
    if (err instanceof Anthropic.RateLimitError) throw new HttpError(429, "Anthropic rate limit reached; try again shortly");
    if (err instanceof Anthropic.APIError) throw new HttpError(502, `Claude API error (${err.status}): ${err.message}`);
    throw err;
  }

  const u = response.usage;
  console.log(
    `[claude] purpose=${opts.purpose} model=${opts.model} input_tokens=${u.input_tokens} output_tokens=${u.output_tokens}` +
      ` cache_write=${u.cache_creation_input_tokens ?? 0} cache_read=${u.cache_read_input_tokens ?? 0} stop=${response.stop_reason}`,
  );

  if (response.stop_reason === "refusal") throw new HttpError(502, "Claude declined this request");
  const text = response.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("");
  return { text, stopReason: response.stop_reason };
}

/**
 * Places the target actors in one batched call. Returns validated placements for the requested
 * actor ids only. Retries once, showing Claude its own invalid reply and the validation error.
 */
export async function requestPlacements(
  targets: PlacementTarget[],
  mapActors: ActorDTO[],
): Promise<PlacementItem[]> {
  const provider = getContextProvider();
  const withContext = await Promise.all(
    targets.map(async (t) => ({ ...t, extraContext: await provider.getContext(t.actor, "placement") })),
  );
  const targetIds = new Set(targets.map((t) => t.actor.id));
  const prompt = placementUserPrompt(compactMapState(mapActors, targetIds), withContext);

  // Thinking tokens count toward max_tokens, so leave headroom beyond the ~250 tokens/actor of JSON.
  const maxTokens = Math.min(16000, 2000 + 450 * targets.length);
  const base = { purpose: "placement" as const, model: config.placementModel, system: PLACEMENT_SYSTEM, maxTokens, effort: "medium" as const };

  const first = await callClaude({ ...base, messages: [{ role: "user", content: prompt }] });
  let items: PlacementItem[];
  try {
    items = parsePlacements(first.text);
  } catch (firstError) {
    const reason = firstError instanceof Error ? firstError.message : String(firstError);
    const note = first.stopReason === "max_tokens" ? " The reply was cut off by the length limit; be more concise." : "";
    const retry = await callClaude({
      ...base,
      messages: [
        { role: "user", content: prompt },
        { role: "assistant", content: first.text || "(empty reply)" },
        { role: "user", content: `That reply was invalid: ${reason}.${note} Reply again with only the corrected JSON object.` },
      ],
    });
    try {
      items = parsePlacements(retry.text);
    } catch (retryError) {
      throw new HttpError(502, `Claude returned an invalid placement twice: ${retryError instanceof Error ? retryError.message : retryError}`);
    }
  }

  const seen = new Set<string>();
  return items.filter((i) => targetIds.has(i.actorId) && !seen.has(i.actorId) && seen.add(i.actorId));
}

const CHAT_TURNS = 12; // history sent to Claude, in messages

type HistoryRow = { role: string; userName: string | null; body: string };

/** Chat answer from the stored rationale plus current map state. Uses the chat model with thinking off. */
export async function answerChat(opts: {
  userName: string;
  message: string;
  history: HistoryRow[];
  mapActors: ActorDTO[];
  focus: FocusData | null;
}): Promise<string> {
  const extraContext = opts.focus
    ? await getContextProvider().getContext(
        { id: opts.focus.actor.id, name: opts.focus.actor.name, type: opts.focus.actor.type },
        "explanation",
      )
    : null;
  const prompt = chatUserPrompt({
    mapState: compactMapState(opts.mapActors),
    focus: opts.focus ? focusBlock(opts.focus) : null,
    extraContext,
    userName: opts.userName,
    message: opts.message,
  });
  const { text } = await callClaude({
    purpose: "chat",
    model: config.chatModel,
    system: CHAT_SYSTEM,
    messages: toChatTurns(opts.history.slice(-CHAT_TURNS), prompt),
    maxTokens: 600,
    thinking: "disabled",
  });
  if (!text.trim()) throw new HttpError(502, "Claude returned an empty reply");
  return text.trim();
}

/** The "why did you place it there?" question. The nearby lists are computed by the caller, not guessed by Claude. */
export async function askFollowUp(opts: {
  userName: string;
  actor: { name: string; x: number; y: number };
  nearby: Nearby;
  mapActors: ActorDTO[];
}): Promise<string> {
  const nothingNearby = opts.nearby.similarPower.length === 0 && opts.nearby.similarSupport.length === 0;
  const prompt = followUpUserPrompt({
    userName: opts.userName,
    actor: opts.actor,
    similarPower: opts.nearby.similarPower,
    similarSupport: opts.nearby.similarSupport,
    mapState: nothingNearby ? compactMapState(opts.mapActors) : null,
  });
  const { text } = await callClaude({
    purpose: "followup",
    model: config.chatModel,
    system: FOLLOWUP_SYSTEM,
    messages: [{ role: "user", content: prompt }],
    maxTokens: 300,
    thinking: "disabled",
  });
  if (!text.trim()) throw new HttpError(502, "Claude returned an empty reply");
  return text.trim();
}
