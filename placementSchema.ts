import { z } from "zod";

export const placementItem = z.object({
  actorId: z.string().min(1),
  power: z.number().min(0).max(10),
  support: z.number().min(-5).max(5),
  powerRationale: z.string().trim().min(1),
  supportRationale: z.string().trim().min(1),
  confidence: z.enum(["low", "medium", "high"]),
});
export type PlacementItem = z.infer<typeof placementItem>;

export const placementResponse = z.object({ placements: z.array(placementItem) });

/** Pulls a JSON object out of model text, tolerating a code fence or a sentence around it. */
export function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = fenced ? fenced[1] : text;
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start === -1 || end <= start) throw new Error("No JSON object found in the reply");
  return JSON.parse(body.slice(start, end + 1));
}

/** Parses and validates a placement reply. Throws an Error whose message is safe to show the model on retry. */
export function parsePlacements(text: string): PlacementItem[] {
  let raw: unknown;
  try {
    raw = extractJson(text);
  } catch (e) {
    throw new Error(`Reply was not valid JSON: ${e instanceof Error ? e.message : String(e)}`);
  }
  const result = placementResponse.safeParse(raw);
  if (!result.success) {
    const issue = result.error.issues[0];
    throw new Error(`JSON did not match the schema at ${issue.path.join(".") || "root"}: ${issue.message}`);
  }
  return result.data.placements;
}
