import { db } from "./db";

/** This build has exactly one map; everything is scoped to it. */
export async function getMap() {
  const map = await db.map.findFirst({ orderBy: { createdAt: "asc" } });
  if (!map) throw new Error("No map found. Run `npm run db:seed`.");
  return map;
}
