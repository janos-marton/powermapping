"use client";

import { useDroppable } from "@dnd-kit/core";
import type { RefObject } from "react";
import type { ActorDTO } from "@/lib/types";
import { MapChip } from "./ActorChip";

const X_TICKS = [-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5];
const Y_TICKS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

const QUADRANTS = [
  { label: "Key Opposition", pos: "left-2 top-2", tint: "bg-rose-50/60" }, // high power / opposes
  { label: "Champions", pos: "right-2 top-2 text-right", tint: "bg-emerald-50/60" }, // high power / supports
  { label: "Low-Priority Opposition", pos: "bottom-2 left-2", tint: "bg-slate-50" }, // low power / opposes
  { label: "Allies to Build Up", pos: "bottom-2 right-2 text-right", tint: "bg-sky-50/60" }, // low power / supports
];

export function PowerMap({
  actors,
  plotRef,
  onSelect,
}: {
  actors: ActorDTO[];
  plotRef: RefObject<HTMLDivElement | null>;
  onSelect: (id: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: "map" });
  const placed = actors.filter((a) => a.x !== null && a.y !== null);

  return (
    <section
      ref={setNodeRef}
      aria-label="Power map"
      className={`rounded-xl border bg-white p-4 pb-3 pl-14 pr-8 ${isOver ? "border-sky-400" : "border-slate-200"}`}
    >
      <div>
       <div className="relative">
        {/* Plot area: all coordinates are computed relative to this element. */}
        <div ref={plotRef} data-testid="plot" className="relative h-[min(58vh,520px)] min-h-[360px] border border-slate-300">
          <div className="absolute inset-0 grid grid-cols-2 grid-rows-2">
            {QUADRANTS.map((q) => (
              <div key={q.label} className={q.tint} />
            ))}
          </div>
          {X_TICKS.map((t) => (
            <div
              key={`vx${t}`}
              className={`absolute inset-y-0 w-px ${t === 0 ? "bg-slate-400" : "bg-slate-200"}`}
              style={{ left: `${((t + 5) / 10) * 100}%` }}
            />
          ))}
          {Y_TICKS.map((t) => (
            <div
              key={`hy${t}`}
              className={`absolute inset-x-0 h-px ${t === 5 ? "bg-slate-400" : "bg-slate-200"}`}
              style={{ top: `${((10 - t) / 10) * 100}%` }}
            />
          ))}
          {QUADRANTS.map((q) => (
            <div
              key={q.label}
              className={`pointer-events-none absolute text-xs font-semibold uppercase tracking-wide text-slate-400 ${q.pos}`}
            >
              {q.label}
            </div>
          ))}
          {placed.map((a) => (
            <MapChip key={a.id} actor={a} onSelect={onSelect} />
          ))}
        </div>

        {Y_TICKS.map((t) => (
          <span
            key={`ly${t}`}
            className="absolute -left-6 w-4 -translate-y-1/2 text-right text-[10px] text-slate-500"
            style={{ top: `${((10 - t) / 10) * 100}%` }}
          >
            {t}
          </span>
        ))}
        <div
          className="pointer-events-none absolute -left-12 top-1/2 -translate-y-1/2 rotate-180 whitespace-nowrap text-[11px] font-semibold text-slate-600"
          style={{ writingMode: "vertical-rl" }}
        >
          Political power (influence on the NYS Legislature)
        </div>
       </div>
        <div className="relative mt-1 h-4">
          {X_TICKS.map((t) => (
            <span
              key={`lx${t}`}
              className="absolute -translate-x-1/2 text-[10px] text-slate-500"
              style={{ left: `${((t + 5) / 10) * 100}%` }}
            >
              {t > 0 ? `+${t}` : t}
            </span>
          ))}
        </div>
        <div className="mt-1 flex justify-between text-[11px] text-slate-600">
          <span>← Opposes regulation (favors expanded surveillance)</span>
          <span className="font-semibold">Support for surveillance regulation</span>
          <span>Supports regulation and limits →</span>
        </div>
      </div>
      {placed.length === 0 && (
        <p className="mt-2 text-center text-xs text-slate-400">Drag actors from the dashboard below onto the map.</p>
      )}
    </section>
  );
}
