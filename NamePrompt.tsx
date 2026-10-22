"use client";

import { useState } from "react";

export function NamePrompt({ onDone }: { onDone: (name: string) => void }) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/identity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    setBusy(false);
    if (!res.ok) return setError((await res.json().catch(() => null))?.error ?? "Could not save name");
    onDone((await res.json()).name);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <form onSubmit={submit} className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-slate-900">Welcome to the Power Map</h2>
        <p className="mt-1 text-sm text-slate-600">
          Enter your name. It is attached to your placements, notes, and chat messages. There is no password.
        </p>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          maxLength={40}
          className="mt-4 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        <button
          disabled={busy || !name.trim()}
          className="mt-4 w-full rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          Continue
        </button>
      </form>
    </div>
  );
}
