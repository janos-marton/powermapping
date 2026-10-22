"use client";

import { useState } from "react";

/** Posts a note to an actor. Used by the actor panel and the move-nudge toast. */
export function NoteInput({
  actorId,
  placeholder = "Add a note for your colleagues…",
  autoFocus,
  onPosted,
}: {
  actorId: string;
  placeholder?: string;
  autoFocus?: boolean;
  onPosted: () => void;
}) {
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/actors/${actorId}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    });
    setBusy(false);
    if (!res.ok) return setError((await res.json().catch(() => null))?.error ?? "Could not save note");
    setBody("");
    onPosted();
  }

  return (
    <form onSubmit={submit}>
      <textarea
        autoFocus={autoFocus}
        rows={2}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={placeholder}
        aria-label="Note"
        className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm"
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
      <button
        disabled={busy || !body.trim()}
        className="mt-1 rounded-md bg-slate-900 px-3 py-1 text-sm font-medium text-white disabled:opacity-50"
      >
        Add note
      </button>
    </form>
  );
}
