import { z } from "zod";
import { ACTOR_TYPES } from "./actorTypes";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => v ?? "");

export const actorInput = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  type: z.enum(ACTOR_TYPES),
  affiliation: optionalText(200),
  description: optionalText(1000),
  // Empty string means "no holder recorded".
  currentHolder: z
    .string()
    .trim()
    .max(200)
    .optional()
    .transform((v) => v || null),
});
export type ActorInput = z.infer<typeof actorInput>;

export const noteInput = z.object({ body: z.string().trim().min(1, "Note can't be empty").max(4000) });
