/**
 * Extension seam for extra context about an actor, fetched before a placement or an explanation.
 *
 * WEB SEARCH (not built): to add it, implement `ContextProvider` with a provider that returns
 * recent, sourced findings for the actor, and return it from `getContextProvider()` when
 * `config.enableWebSearch` is true. Two ways to do it:
 *   1. Pass Anthropic's server-side web search tool in the `tools` array of the calls in
 *      lib/claude.ts (keeps everything in one request), or
 *   2. Run a search/fetch step here and return the findings as text.
 * Either way, keep the source URLs next to each finding, tell the model to cite them in the
 * rationale, and store them with the placement so staff can check them. The prompts in
 * lib/prompts.ts currently say "never invent specifics"; a search-enabled prompt would relax
 * that only for facts that appear in the supplied sources.
 */
import { config } from "./config";

export type ContextPurpose = "placement" | "explanation";

export type ActorRef = { id: string; name: string; type: string };

export interface ContextProvider {
  /** Extra context for one actor, or null when there is none. */
  getContext(actor: ActorRef, purpose: ContextPurpose): Promise<string | null>;
}

export class NoOpContextProvider implements ContextProvider {
  async getContext(): Promise<string | null> {
    return null;
  }
}

export function getContextProvider(): ContextProvider {
  // config.enableWebSearch is read but intentionally unused until a provider exists.
  void config.enableWebSearch;
  return new NoOpContextProvider();
}
