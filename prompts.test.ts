import { describe, expect, it } from "vitest";
import { focusBlock, followUpUserPrompt, toChatTurns } from "./prompts";
import type { ActorDTO } from "./types";

const actor: ActorDTO = {
  id: "a1",
  name: "NYSUT",
  type: "Union",
  affiliation: "",
  description: "SECRET LONG DESCRIPTION",
  currentHolder: null,
  x: 3,
  y: 6,
  placedBySource: "claude",
  placedByUser: "Claude",
  placedAt: "2026-10-22T12:00:00.000Z",
  claudeRationale: { power: "Big membership.", support: "Backs limits in schools." },
  claudeConfidence: "medium",
};

describe("toChatTurns", () => {
  it("prefixes staff names, tags events, drops leading assistant turns, and ends with the new message", () => {
    const turns = toChatTurns(
      [
        { role: "assistant", userName: null, body: "old reply" },
        { role: "user", userName: "Maria", body: "hi" },
        { role: "system_event", userName: "Maria", body: "Maria placed X" },
        { role: "assistant", userName: null, body: "ok" },
      ],
      "FINAL",
    );
    expect(turns.map((t) => t.role)).toEqual(["user", "user", "assistant", "user"]);
    expect(turns[0].content).toBe("Maria: hi");
    expect(turns[1].content).toBe("[map event] Maria placed X");
    expect(turns.at(-1)?.content).toBe("FINAL");
  });
});

describe("focusBlock", () => {
  it("includes the stored rationale and caps what it shows, without the description", () => {
    const text = focusBlock({
      actor,
      events: [{ source: "claude", userName: "Claude", fromX: null, fromY: null, toX: 3, toY: 6, createdAt: "2026-10-22T12:00:00Z" }],
      notes: [{ userName: "Sam", body: "Check the 2025 position", createdAt: "2026-10-23T09:00:00Z" }],
    });
    expect(text).toContain("confidence: medium");
    expect(text).toContain("power: Big membership.");
    expect(text).toContain("support: Backs limits in schools.");
    expect(text).toContain("Sam (2026-10-23): Check the 2025 position");
    expect(text).not.toContain("SECRET LONG DESCRIPTION");
  });

  it("says plainly when there is no stored rationale", () => {
    const text = focusBlock({ actor: { ...actor, placedBySource: "user", placedByUser: "Maria", claudeRationale: null, claudeConfidence: null }, events: [], notes: [] });
    expect(text).toContain("No stored Claude rationale");
    expect(text).toContain("placed by Maria");
  });
});

describe("followUpUserPrompt", () => {
  const near = { name: "NYCLU", x: 4, y: 6.5 };
  it("lists the computed nearby actors and omits the map state", () => {
    const text = followUpUserPrompt({ userName: "Maria", actor: { name: "NYSUT", x: 3, y: 6 }, similarPower: [near], similarSupport: [], mapState: null });
    expect(text).toContain("Similar power (within ±1.5 on power): NYCLU (power 6.5, support +4)");
    expect(text).toContain("Similar support (within ±1.5 on support): none");
    expect(text).not.toContain("MAP STATE");
  });
  it("includes the map state only when asked", () => {
    const text = followUpUserPrompt({ userName: "Maria", actor: { name: "NYSUT", x: 3, y: 6 }, similarPower: [], similarSupport: [], mapState: "id|n|t|1|2" });
    expect(text).toContain("MAP STATE");
  });
});
