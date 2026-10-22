export const config = {
  placementModel: process.env.ANTHROPIC_MODEL_PLACEMENT || "claude-sonnet-5-5",
  chatModel: process.env.ANTHROPIC_MODEL_CHAT || "claude-haiku-5-5",
  // Read but intentionally unused for now. See lib/context.ts for where web search would plug in.
  enableWebSearch: process.env.ENABLE_WEB_SEARCH === "true",
};
