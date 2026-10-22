"use client";

import { useCallback, useEffect, useState } from "react";
import { typeIcon } from "@/lib/actorTypes";
import { formatPos } from "@/lib/format";
import type { ActorDTO, NoteDTO, PlacementEventDTO } from "@/lib/types";
import { NoteInput } from "./NoteInput";
import { PlacerBadge } from "./PlacerBadge";

const when = (iso: string) => new Date(iso).toLocaleString([], { dateStyle: "medium", timeStyle: "short" });

function describeEvent(e: PlacementEventDTO) {
  const who = e.source === "claude" ? "Claude" : e.userName;
  const to = e.toX !== null && e.toY !== null ? formatPos(e.toX, e.toY) : null;
  const from = e.fromX !== null && e.fromY !== null ? formatPos(e.fromX, e.fromY) : null;
  if (!to) return `${who} removed it from the map (was ${from})`;
  if (!from) return `${who} placed it at ${to}`;
  return `${who} moved it from ${from} to ${to}`;
}

export function ActorPanel({
  actor,
  version,
  onClose,
  onEdit,
  onDeleted,
  onAskClaude,
  claudeBusy,
}: {
  actor: ActorDTO;
  /** Changes whenever the actor's placement changes, so history reloads promptly. */
  version: string;
  onClose: () => void;
  onEdit: () => void;
  onDeleted: (id: string) => void;
  onAskClaude: () => void;
  claudeBusy: boolean;
}) {
  const [events, setEvents] = useState<PlacementEventDTO[]>([]);
  const [notes, setNotes] = useState<NoteDTO[]>([]);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/actors/${actor.id}`, { cache: "no-store" });
    if (!res.ok) return;
    const data = await res.json();
    setEvents(data.events);
    setNotes(data.notes);
  }, [actor.id]);

  // Reload on open, when placement changes, and on the same 5s cadence as the main sync.
  useEffect(() => {
    load();
    const id = setInterval(() => document.visibilityState === "visible" && load(), 5000);
    return () => clearInterval(id);
  }, [load, version]);

  async function remove() {
    const res = await fetch(`/api/actors/${actor.id}`, { method: "DELETE" });
    if (!res.ok) return setError((await res.json().catch(() => null))?.error ?? "Could not delete");
    onDeleted(actor.id);
  }

  const placed = actor.x !== null && actor.y !== null;
  const section = "border-t border-slate-200 px-4 py-3";
  const h = "mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500";

  return (
    <aside
      aria-label="Actor details"
      className="fixed inset-y-0 right-0 z-30 lg:right-96 flex w-full max-w-md flex-col overflow-y-auto border-l border-slate-200 bg-white shadow-xl"
    >
      <div className="flex items-start justify-between gap-2 px-4 py-3">
        <div className="min-w-0">
          <h2 className="text-base font-semibold leading-snug text-slate-900">
            <span aria-hidden>{typeIcon(actor.type)}</span> {actor.name}
          </h2>
          <p className="text-xs text-slate-500">
            {actor.type}
            {actor.affiliation ? ` · ${actor.affiliation}` : ""}
          </p>
          {actor.currentHolder && <p className="mt-1 text-sm text-slate-700">Current holder: {actor.currentHolder}</p>}
        </div>
        <button onClick={onClose} aria-label="Close panel" className="text-slate-500 hover:text-slate-900">
          ✕
        </button>
      </div>
      {actor.description && <p className="px-4 pb-3 text-sm text-slate-700">{actor.description}</p>}
      <div className="flex gap-2 px-4 pb-3">
        <button onClick={onEdit} className="rounded-md border border-slate-300 px-2.5 py-1 text-sm hover:bg-slate-50">
          Edit
        </button>
        <button
          onClick={onAskClaude}
          disabled={claudeBusy}
          className="rounded-md bg-violet-600 px-2.5 py-1 text-sm font-medium text-white disabled:opacity-50"
        >
          {claudeBusy ? "Claude is placing…" : actor.x !== null ? "Ask Claude to re-place" : "Ask Claude to place"}
        </button>
        {confirmingDelete ? (
          <span className="flex items-center gap-2 text-sm">
            <span className="text-red-700">Delete this actor, its notes and history?</span>
            <button onClick={remove} className="rounded-md bg-red-600 px-2.5 py-1 text-white">
              Delete
            </button>
            <button onClick={() => setConfirmingDelete(false)} className="rounded-md border border-slate-300 px-2.5 py-1">
              Cancel
            </button>
          </span>
        ) : (
          <button
            onClick={() => setConfirmingDelete(true)}
            className="rounded-md border border-red-200 px-2.5 py-1 text-sm text-red-700 hover:bg-red-50"
          >
            Delete
          </button>
        )}
      </div>
      {error && <p className="px-4 pb-2 text-sm text-red-600">{error}</p>}

      <section className={section}>
        <h3 className={h}>Current position</h3>
        {placed ? (
          <div className="space-y-1 text-sm text-slate-800">
            <div>{formatPos(actor.x as number, actor.y as number)}</div>
            <div className="flex items-center gap-1.5 text-xs text-slate-600">
              Placed by <PlacerBadge actor={actor} />
              {actor.placedBySource === "claude" ? "Claude" : actor.placedByUser}
              {actor.placedAt && <span>· {when(actor.placedAt)}</span>}
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-500">Not placed on the map.</p>
        )}
      </section>

      {actor.claudeRationale && (
        <section className={section}>
          <h3 className={h}>
            Claude&apos;s rationale{actor.claudeConfidence && <span className="ml-1 normal-case">({actor.claudeConfidence} confidence)</span>}
          </h3>
          <p className="text-sm text-slate-800">
            <span className="font-medium">Power:</span> {actor.claudeRationale.power}
          </p>
          <p className="mt-1.5 text-sm text-slate-800">
            <span className="font-medium">Support:</span> {actor.claudeRationale.support}
          </p>
        </section>
      )}

      <section className={section}>
        <h3 className={h}>Notes</h3>
        <NoteInput actorId={actor.id} onPosted={load} />
        <ul className="mt-3 space-y-2">
          {notes.length === 0 && <li className="text-sm text-slate-500">No notes yet.</li>}
          {notes.map((n) => (
            <li key={n.id} className="rounded-md bg-slate-50 px-3 py-2 text-sm">
              <div className="text-xs text-slate-500">
                <span className="font-medium text-slate-700">{n.userName}</span> · {when(n.createdAt)}
              </div>
              <p className="mt-0.5 whitespace-pre-wrap text-slate-800">{n.body}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className={section}>
        <h3 className={h}>Placement history</h3>
        <ul className="space-y-2">
          {events.length === 0 && <li className="text-sm text-slate-500">No placements yet.</li>}
          {events.map((e) => (
            <li key={e.id} className="text-sm text-slate-800">
              {describeEvent(e)}
              {e.source === "claude" && e.confidence && <span className="text-xs text-slate-500"> ({e.confidence} confidence)</span>}
              {e.rationale && <p className="mt-0.5 text-xs text-slate-600">{e.rationale}</p>}
              <div className="text-xs text-slate-500">{when(e.createdAt)}</div>
            </li>
          ))}
        </ul>
      </section>
    </aside>
  );
}
