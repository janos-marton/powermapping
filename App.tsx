"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useMapSync } from "@/lib/sync";
import type { ActorDTO, ChatMessageDTO, PreviousPlacement } from "@/lib/types";
import { ActorFormModal } from "./ActorFormModal";
import { ActorPanel } from "./ActorPanel";
import { ChatPanel } from "./ChatPanel";
import { Dashboard } from "./Dashboard";
import { DndShell } from "./DndShell";
import { MoveNudgeToast, type Nudge } from "./MoveNudgeToast";
import { NamePrompt } from "./NamePrompt";
import { PowerMap } from "./PowerMap";

const FOLLOWUP_DEBOUNCE_MS = 3000;

function readCookieName(): string | null {
  const m = document.cookie.match(/(?:^|; )dream_user=([^;]*)/);
  if (!m) return null;
  try {
    return decodeURIComponent(m[1]) || null;
  } catch {
    return m[1] || null;
  }
}

export function App() {
  const [ready, setReady] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);
  useEffect(() => {
    setUserName(readCookieName());
    setReady(true);
  }, []);

  const { state, setState, refresh, hold, unauthorized, error } = useMapSync(!!userName);
  const [writeError, setWriteError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<{ mode: "add" } | { mode: "edit"; actorId: string } | null>(null);
  const [nudge, setNudge] = useState<Nudge | null>(null);
  const [claudeBusy, setClaudeBusy] = useState(false);
  const [chatSending, setChatSending] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const followupTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const followupsOn = useRef(true);
  const plotRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    followupsOn.current = state?.settings.claudeFollowUps ?? true;
  }, [state?.settings.claudeFollowUps]);
  useEffect(() => () => {
    if (followupTimer.current) clearTimeout(followupTimer.current);
  }, []);
  const dragRelease = useRef<(() => void) | null>(null);

  const patchActor = useCallback(
    (id: string, patch: Partial<ActorDTO>) =>
      setState((s) => (s ? { ...s, actors: s.actors.map((a) => (a.id === id ? { ...a, ...patch } : a)) } : s)),
    [setState],
  );

  async function writePlacement(actorId: string, optimistic: Partial<ActorDTO>, body: object) {
    patchActor(actorId, optimistic);
    const release = hold();
    try {
      const res = await fetch(`/api/actors/${actorId}/place`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? "Could not save placement");
      const data: { previous: PreviousPlacement } = await res.json();
      setWriteError(null);
      return data.previous;
    } catch (e) {
      setWriteError(e instanceof Error ? e.message : "Could not save placement");
    } finally {
      release();
      refresh(); // reconcile with the server (also reverts a failed optimistic move)
    }
  }

  /** Appends messages returned by a write, ignoring ones the poll already delivered. */
  const addMessages = (added: ChatMessageDTO[]) =>
    setState((s) => {
      if (!s) return s;
      const have = new Set(s.messages.map((m) => m.id));
      return { ...s, messages: [...s.messages, ...added.filter((m) => !have.has(m.id))] };
    });

  /**
   * After a user placement settles, ask Claude one question about it. Every placement restarts the timer,
   * so a run of rapid drags produces a single prompt, about the last actor moved. The server re-checks the
   * toggle, so this is only an optimization.
   */
  function scheduleFollowup(actorId: string) {
    if (followupTimer.current) clearTimeout(followupTimer.current);
    followupTimer.current = setTimeout(async () => {
      followupTimer.current = null;
      if (!followupsOn.current) return;
      try {
        const res = await fetch("/api/chat/followup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ actorId }),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) setChatError(data?.error ?? "Claude could not follow up");
        else if (data?.message) addMessages([data.message]);
      } finally {
        refresh();
      }
    }, FOLLOWUP_DEBOUNCE_MS);
  }

  async function sendChat(body: string) {
    setChatSending(true);
    setChatError(null);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body, actorId: selectedId ?? undefined }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Could not send message");
      addMessages(data.messages);
    } catch (e) {
      setChatError(e instanceof Error ? e.message : "Could not send message");
    } finally {
      setChatSending(false);
      refresh(); // shows the saved user message even if Claude failed to answer
    }
  }

  async function setFollowUps(on: boolean) {
    setState((s) => (s ? { ...s, settings: { claudeFollowUps: on } } : s));
    const release = hold();
    try {
      await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ claudeFollowUps: on }),
      });
    } finally {
      release();
      refresh();
    }
  }

  /** Shows the "why did you move it?" nudge when someone else (or Claude) last placed this actor. */
  function maybeNudge(actorId: string, previous: PreviousPlacement) {
    if (previous && previous.by !== userName) setNudge({ actorId, previousBy: previous.by });
  }

  /** Ask Claude to place the given actors, or every unplaced actor when none are given. */
  async function askClaude(actorIds?: string[]) {
    setClaudeBusy(true);
    setWriteError(null);
    try {
      const res = await fetch("/api/claude/place", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(actorIds ? { actorIds } : {}),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Claude placement failed");
      if (data.missing?.length) setWriteError(`Claude did not return a placement for ${data.missing.length} actor(s).`);
    } catch (e) {
      setWriteError(e instanceof Error ? e.message : "Claude placement failed");
    } finally {
      setClaudeBusy(false);
      refresh();
    }
  }

  async function place(actorId: string, x: number, y: number) {
    const previous = await writePlacement(
      actorId,
      {
        x,
        y,
        placedBySource: "user",
        placedByUser: userName,
        placedAt: new Date().toISOString(),
        claudeRationale: null,
        claudeConfidence: null,
      },
      { x, y },
    );
    if (previous === undefined) return; // the write failed
    maybeNudge(actorId, previous);
    scheduleFollowup(actorId);
  }

  async function unplace(actorId: string) {
    const previous = await writePlacement(
      actorId,
      { x: null, y: null, placedBySource: null, placedByUser: null, placedAt: null, claudeRationale: null, claudeConfidence: null },
      { unplace: true },
    );
    if (previous !== undefined) maybeNudge(actorId, previous);
  }

  const selected = state?.actors.find((a) => a.id === selectedId) ?? null;

  if (!ready) return null;
  if (!userName || unauthorized) return <NamePrompt onDone={setUserName} />;

  return (
    <div className="min-h-screen bg-slate-100 lg:pr-96">
      <header className="border-b border-slate-200 bg-white px-6 py-3">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <div>
            <h1 className="text-base font-semibold text-slate-900">Power Map · Dream.Org</h1>
            <p className="text-sm text-slate-600">
              {state ? `${state.map.jurisdiction} · ${state.map.issue}` : "New York State · Government surveillance policy"}
            </p>
          </div>
          <button
            onClick={() => setUserName(null)}
            title="Change name"
            className="rounded-md border border-slate-300 px-2.5 py-1 text-sm text-slate-700 hover:bg-slate-50"
          >
            {userName}
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-4 px-6 py-4">
        {(writeError || error) && (
          <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {writeError ?? error}
          </div>
        )}
        {!state ? (
          <p className="py-20 text-center text-sm text-slate-500">Loading…</p>
        ) : (
          <DndShell
            actors={state.actors}
            plotRef={plotRef}
            onPlace={place}
            onUnplace={unplace}
            onDragActive={(active) => {
              if (active) dragRelease.current = hold();
              else {
                dragRelease.current?.();
                dragRelease.current = null;
              }
            }}
          >
            <PowerMap actors={state.actors} plotRef={plotRef} onSelect={setSelectedId} />
            <Dashboard
              actors={state.actors}
              onSelect={setSelectedId}
              onAdd={() => setForm({ mode: "add" })}
              onAskClaude={() => askClaude()}
              claudeBusy={claudeBusy}
            />
          </DndShell>
        )}
      </main>

      <ChatPanel
        messages={state?.messages ?? []}
        userName={userName}
        claudeFollowUps={state?.settings.claudeFollowUps ?? true}
        onToggleFollowUps={setFollowUps}
        onSend={sendChat}
        sending={chatSending}
        error={chatError}
        focusName={selected?.name ?? null}
      />
      {selected && (
        <ActorPanel
          key={selected.id}
          actor={selected}
          version={`${selected.x}|${selected.y}|${selected.placedAt}`}
          onClose={() => setSelectedId(null)}
          onEdit={() => setForm({ mode: "edit", actorId: selected.id })}
          onAskClaude={() => askClaude([selected.id])}
          claudeBusy={claudeBusy}
          onDeleted={(id) => {
            setSelectedId(null);
            setState((s) => (s ? { ...s, actors: s.actors.filter((a) => a.id !== id) } : s));
            refresh();
          }}
        />
      )}
      {form && (
        <ActorFormModal
          actor={form.mode === "edit" ? state?.actors.find((a) => a.id === form.actorId) : undefined}
          onClose={() => setForm(null)}
          onSaved={(actor) => {
            setForm(null);
            setState((s) =>
              s
                ? {
                    ...s,
                    actors: s.actors.some((a) => a.id === actor.id)
                      ? s.actors.map((a) => (a.id === actor.id ? actor : a))
                      : [...s.actors, actor],
                  }
                : s,
            );
            refresh();
          }}
        />
      )}
      {nudge && <MoveNudgeToast key={nudge.actorId + nudge.previousBy} nudge={nudge} onDismiss={() => setNudge(null)} />}
    </div>
  );
}
