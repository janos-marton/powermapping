"use client";

import { useDroppable } from "@dnd-kit/core";
import { useMemo, useState } from "react";
import { ACTOR_TYPES } from "@/lib/actorTypes";
import type { ActorDTO } from "@/lib/types";
import { DashboardCard } from "./ActorCard";

export function Dashboard({
  actors,
  onSelect,
  onAdd,
  onAskClaude,
  claudeBusy,
}: {
  actors: ActorDTO[];
  onSelect: (id: string) => void;
  onAdd: () => void;
  onAskClaude: () => void;
  claudeBusy: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: "dashboard" });
  const [query, setQuery] = useState("");
  const [type, setType] = useState("");

  const unplaced = useMemo(() => actors.filter((a) => a.x === null || a.y === null), [actors]);
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return unplaced.filter(
      (a) =>
        (!type || a.type === type) &&
        (!q || [a.name, a.affiliation, a.currentHolder ?? "", a.description].some((s) => s.toLowerCase().includes(q))),
    );
  }, [unplaced, query, type]);

  return (
    <section
      ref={setNodeRef}
      aria-label="Unplaced actors"
      className={`rounded-xl border p-4 ${isOver ? "border-sky-400 bg-sky-50" : "border-slate-200 bg-slate-50"}`}
    >
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h2 className="mr-auto text-sm font-semibold text-slate-800">
          Unplaced actors <span className="font-normal text-slate-500">({unplaced.length})</span>
        </h2>
        <button
          onClick={onAskClaude}
          disabled={claudeBusy || unplaced.length === 0}
          title="Claude places every unplaced actor in one request"
          className="rounded-md bg-violet-600 px-3 py-1 text-sm font-medium text-white disabled:opacity-50"
        >
          {claudeBusy ? "Claude is placing…" : "Ask Claude to place all"}
        </button>
        <button onClick={onAdd} className="rounded-md bg-slate-900 px-3 py-1 text-sm font-medium text-white">
          Add actor
        </button>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search actors"
          aria-label="Search actors"
          className="w-48 rounded-md border border-slate-300 bg-white px-2 py-1 text-sm"
        />
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          aria-label="Filter by type"
          className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm"
        >
          <option value="">All types</option>
          {ACTOR_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>
      {visible.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-500">
          {unplaced.length === 0 ? "All actors are on the map. Drag a chip here to unplace it." : "No actors match."}
        </p>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(15rem,1fr))] gap-3">
          {visible.map((a) => (
            <DashboardCard key={a.id} actor={a} onSelect={onSelect} />
          ))}
        </div>
      )}
    </section>
  );
}
