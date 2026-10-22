import type Anthropic from "@anthropic-ai/sdk";
import { afterEach, describe, expect, it, vi } from "vitest";
import { requestPlacements, setClientForTests } from "./claude";
import { parsePlacements } from "./placementSchema";
import type { PlacementTarget } from "./prompts";
import type { ActorDTO } from "./types";

const actor = (id: string, over: Partial<ActorDTO> = {}): ActorDTO => ({
  id,
  name: `Actor ${id}`,
  type: "Union",
  affiliation: "",
  description: "",
  currentHolder: null,
  x: null,
  y: null,
  placedBySource: null,
  placedByUser: null,
  placedAt: null,
  claudeRationale: null,
  claudeConfidence: null,
  ...over,
});

const item = (actorId: string, over: object = {}) => ({
  actorId,
  power: 6,
  support: 3,
  powerRationale: "Two sentences.",
  supportRationale: "Two more.",
  confidence: "medium",
  ...over,
});

const reply = (text: string, stop = "end_turn") => ({
  content: [{ type: "text", text }],
  stop_reason: stop,
  usage: { input_tokens: 100, output_tokens: 50, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 },
});

function fakeClient(...replies: object[]) {
  const create = vi.fn();
  replies.forEach((r) => create.mockResolvedValueOnce(r));
  setClientForTests({ messages: { create } } as unknown as Anthropic);
  return create;
}

const target = (id: string): PlacementTarget => ({ actor: actor(id), notes: [], extraContext: null });

afterEach(() => setClientForTests(null));

describe("parsePlacements", () => {
  it("accepts plain JSON and fenced JSON with surrounding prose", () => {
    const json = JSON.stringify({ placements: [item("a")] });
    expect(parsePlacements(json)).toHaveLength(1);
    expect(parsePlacements("Here you go:\n```json\n" + json + "\n```")).toHaveLength(1);
  });
  it("rejects out-of-range values and bad confidence", () => {
    expect(() => parsePlacements(JSON.stringify({ placements: [item("a", { power: 11 })] }))).toThrow(/power/);
    expect(() => parsePlacements(JSON.stringify({ placements: [item("a", { support: -6 })] }))).toThrow(/support/);
    expect(() => parsePlacements(JSON.stringify({ placements: [item("a", { confidence: "sure" })] }))).toThrow(/confidence/);
  });
  it("rejects non-JSON", () => {
    expect(() => parsePlacements("I think it is high power.")).toThrow(/not valid JSON/);
  });
});

describe("requestPlacements", () => {
  it("returns validated placements in one batched call", async () => {
    const create = fakeClient(reply(JSON.stringify({ placements: [item("a"), item("b", { power: 2 })] })));
    const out = await requestPlacements([target("a"), target("b")], []);
    expect(out.map((o) => o.actorId)).toEqual(["a", "b"]);
    expect(create).toHaveBeenCalledTimes(1);
    const params = create.mock.calls[0][0];
    expect(params.system[0].cache_control).toEqual({ type: "ephemeral" });
    expect(params.messages[0].content).toContain("TARGETS TO PLACE (2)");
  });

  it("retries once on invalid JSON, showing the error", async () => {
    const create = fakeClient(reply("not json"), reply(JSON.stringify({ placements: [item("a")] })));
    const out = await requestPlacements([target("a")], []);
    expect(out).toHaveLength(1);
    expect(create).toHaveBeenCalledTimes(2);
    const retryMessages = create.mock.calls[1][0].messages;
    expect(retryMessages.at(-1).content).toMatch(/invalid/);
  });

  it("fails after a second invalid reply", async () => {
    const create = fakeClient(reply("nope"), reply("still nope"));
    await expect(requestPlacements([target("a")], [])).rejects.toThrow(/invalid placement twice/);
    expect(create).toHaveBeenCalledTimes(2);
  });

  it("drops unknown and duplicate actor ids", async () => {
    fakeClient(reply(JSON.stringify({ placements: [item("a"), item("a"), item("zzz")] })));
    const out = await requestPlacements([target("a"), target("b")], []);
    expect(out.map((o) => o.actorId)).toEqual(["a"]);
  });

  it("sends compact map state and only the capped notes for targets", async () => {
    const create = fakeClient(reply(JSON.stringify({ placements: [item("a")] })));
    const placed = actor("p", { x: 1.5, y: 7, description: "LONG DESCRIPTION MUST NOT APPEAR" });
    await requestPlacements([{ actor: actor("a"), notes: [{ userName: "Sam", body: "note text" }], extraContext: null }], [placed, actor("a")]);
    const prompt: string = create.mock.calls[0][0].messages[0].content;
    expect(prompt).toContain("p|Actor p|Union|1.5|7");
    expect(prompt).not.toContain("LONG DESCRIPTION");
    expect(prompt).toContain("staff note (Sam): note text");
  });
});
