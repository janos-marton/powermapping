"use client";

import { useState } from "react";
import { ACTOR_TYPES } from "@/lib/actorTypes";
import type { ActorDTO } from "@/lib/types";

/** Add (no `actor`) or edit (with `actor`) form. New actors are created unplaced. */
export function ActorFormModal({
  actor,
  onClose,
  onSaved,
}: {
  actor?: ActorDTO;
  onClose: () => void;
  onSaved: (actor: ActorDTO) => void;
}) {
  const [form, setForm] = useState({
    name: actor?.name ?? "",
    type: actor?.type ?? ACTOR_TYPES[0],
    affiliation: actor?.affiliation ?? "",
    description: actor?.description ?? "",
    currentHolder: actor?.currentHolder ?? "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch(actor ? `/api/actors/${actor.id}` : "/api/actors", {
      method: actor ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setBusy(false);
    const data = await res.json().catch(() => null);
    if (!res.ok) return setError(data?.error ?? "Could not save actor");
    onSaved(data.actor);
  }

  const field = "mt-1 w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-sm";
  const label = "block text-xs font-medium text-slate-700";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" role="dialog" aria-modal="true">
      <form onSubmit={submit} className="max-h-full w-full max-w-md space-y-3 overflow-y-auto rounded-xl bg-white p-5 shadow-xl">
        <h2 className="text-base font-semibold text-slate-900">{actor ? "Edit actor" : "Add actor"}</h2>
        <label className={label}>
          Name
          <input autoFocus required value={form.name} onChange={set("name")} className={field} />
        </label>
        <label className={label}>
          Type
          <select value={form.type} onChange={set("type")} className={field}>
            {ACTOR_TYPES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
        <label className={label}>
          Affiliation <span className="font-normal text-slate-500">(party, district, or parent org)</span>
          <input value={form.affiliation} onChange={set("affiliation")} className={field} />
        </label>
        <label className={label}>
          Short description
          <textarea rows={3} value={form.description} onChange={set("description")} className={field} />
        </label>
        <label className={label}>
          Current holder <span className="font-normal text-slate-500">(optional; verify before entering)</span>
          <input value={form.currentHolder} onChange={set("currentHolder")} className={field} />
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm">
            Cancel
          </button>
          <button
            disabled={busy || !form.name.trim()}
            className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
          >
            {actor ? "Save" : "Add actor"}
          </button>
        </div>
      </form>
    </div>
  );
}
