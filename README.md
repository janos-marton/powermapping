# NY Surveillance Policy Power Map (Dream.Org)

An internal tool for Dream.Org staff to map actors by **political power** (influence over what the New York State Legislature
passes, blocks, amends, or funds, including the Governor's budget and veto) and **support for surveillance regulation**, with shared
notes, Claude-assisted placement, and a team chat. One shared map: New York State / Government surveillance policy.

There are no passwords or roles. On first visit you enter a display name (stored in a cookie); every placement, note, and chat
message is attributed to it. Anyone can type any name, so treat the attribution as a convenience, not security. Do not expose
this app outside the team.

## Setup

Requires Node.js 20 or newer.

```bash
npm install
cp .env.example .env     # then add ANTHROPIC_API_KEY (only the Claude features need it)
npx prisma migrate dev   # creates prisma/dev.db and generates the Prisma client
npm run db:seed          # one map and 20 unplaced actors; safe to run again
npm run dev              # http://localhost:3000
```

To run a production build locally: `npm run build && npm start`.

## Environment variables

| Variable | Default | Purpose |
|---|---|---|
| `DATABASE_URL` | `file:./dev.db` | Prisma connection string (SQLite file, relative to `prisma/`) |
| `ANTHROPIC_API_KEY` | none | Server-side only; never sent to the browser. Without it the app works but Claude features return a clear error |
| `ANTHROPIC_WORKSPACE_ID` | none | Only if your key isn't scoped to a workspace; sent as the `anthropic-workspace-id` header |
| `ANTHROPIC_MODEL_PLACEMENT` | `claude-sonnet-5-5` | Model for placement requests |
| `ANTHROPIC_MODEL_CHAT` | `claude-haiku-5-5` | Model for chat replies and placement follow-ups |
| `ENABLE_WEB_SEARCH` | `false` | Read but unused; reserved for a future web-search provider |

## Seeding

`npm run db:seed` creates the single `Map` record and the 20 starter actors (offices and organizations, not named individuals),
all unplaced. It only adds actors that are missing by name, so re-running never touches existing data or placements.
The `currentHolder` field is left blank for staff to fill in after verifying who holds each role.

## Using it

- **Map:** drag actors from the dashboard onto the map, move them around, or drag them back to the dashboard to unplace them.
  Y is political power (0 to 10); X is support for regulation (-5 to +5). Chips show who placed them: a Claude badge or initials.
- **Actor panel:** click any actor. It shows details, current position and who placed it, Claude's stored rationale, notes (newest
  first), and placement history. Add, edit, and delete actors from the dashboard and the panel.
- **Move nudge:** if you move an actor that someone else (or Claude) last placed, a toast asks you to add a note about why.
- **Ask Claude to place:** from the dashboard for all unplaced actors (one batched request) or from a panel for one actor.
  The last move wins, whether it was a person or Claude, and every move is logged in the history.
- **Chat:** ask Claude about the map. Answers come from the stored rationale and the current map state.

## How Claude is used

All calls go through `lib/claude.ts`; prompts are in `lib/prompts.ts`.

- **Placement** (`POST /api/claude/place`): one batched request for the unplaced actors (chunks of 25 if there are more). Claude returns
  strict JSON per actor (`actorId, power, support, powerRationale, supportRationale, confidence`), validated with zod and retried once
  on failure. Rationales are stored on the actor and in the history. Placement keeps the model's default adaptive thinking at `medium`
  effort.
- **Chat answers** (`POST /api/chat`): chat model, thinking off, `max_tokens` 600. It receives the compact map state, the last 12 chat
  messages, and, for the actor being discussed (the open panel's actor, else one named in the message), its stored rationale, last 3
  placement events, and last 5 notes. It is told to answer from the stored rationale rather than re-derive the placement.
- **Placement follow-ups** (`POST /api/chat/followup`): the header toggle "Claude asks about my placements" (on by default, saved per
  name). After a placement the client waits 3 seconds with no further drops, then asks once, so a run of drags yields one question about
  the last actor. The server computes the actors within ±1.5 on power and on support (`lib/nearby.ts`, up to 3 each) and passes them to
  Claude (`max_tokens` 300); if none are nearby, Claude asks a broader comparison question. With the toggle off the placement is still
  logged to chat and no question is asked.
- **Token discipline:** compact map state (one `id|name|type|x|y` line per actor), notes only for the actor in focus, a 12-message
  history, conservative `max_tokens`, stored rationales reused instead of regenerated, and the static system prompt marked for prompt
  caching. The API only caches prompts above a model-specific minimum length, so `cache_read` may stay 0 for the shorter ones.
- **Token logging:** every request prints one line to the server console, for example
  `[claude] purpose=placement model=claude-sonnet-5-5 input_tokens=... output_tokens=... cache_write=... cache_read=... stop=end_turn`.
- **Refusals:** if Anthropic's safeguards refuse a request, the app shows an error. Server-side refusal fallbacks are not enabled.
- **Web search (not built):** `lib/context.ts` defines a `ContextProvider` and ships only a no-op. Its header comment explains where a
  web-search provider and source citations would plug in.

## Sync

The browser polls `GET /api/state` every 5 seconds (paused while a tab is hidden, and while you drag or save) so colleagues'
placements, notes, and chat appear without a refresh. The sync layer is isolated in `lib/sync.ts`; replacing the polling with
server-sent events means changing that file only. The panel's history and notes reload on the same cadence.

## Tests and checks

```bash
npm test             # unit tests: geometry, nearby actors, placement parsing and retry, prompt builders
npm run typecheck
npm run lint
```

To exercise the Claude routes without spending tokens, point the SDK at any server that implements `POST /v1/messages`:
`ANTHROPIC_BASE_URL=http://127.0.0.1:<port> ANTHROPIC_API_KEY=dummy npm run dev`.

## Switching to Postgres

The schema uses no enums and no SQLite-only types, so only the provider and connection string change.

1. In `prisma/schema.prisma`, change `provider = "sqlite"` to `provider = "postgresql"`.
2. Set `DATABASE_URL` to your Postgres URL, for example `postgresql://user:password@host:5432/dbname`.
3. Delete `prisma/migrations/` (the existing migration is SQLite SQL), then run `npx prisma migrate dev --name init`
   (locally) or `npx prisma migrate deploy` after generating a fresh migration (in CI or production).
4. Run `npm run db:seed`.

On Vercel, set `DATABASE_URL`, `ANTHROPIC_API_KEY`, and the model variables in the project settings, and run the migration as part of
the build or deploy step. Note that the in-memory guards that stop duplicate Claude requests are per server instance.

## Project layout

```
app/api/        route handlers (state, actors, notes, placement, claude/place, chat, chat/followup, settings, identity)
components/     map, dashboard, actor panel, chat, drag and drop
lib/            claude.ts, prompts.ts, context.ts, placement.ts, nearby.ts, geometry.ts, sync.ts, schemas.ts, ...
prisma/         schema.prisma, seed.ts, migrations/
```

Out of scope in this build: passwords or roles, multiple maps or a map switcher, per-bill scoring, relationship arrows,
relationship-to-Dream.Org tags, export, private notes, and live web search.
