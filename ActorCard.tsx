"use client";

import { useDraggable } from "@dnd-kit/core";
import { typeIcon } from "@/lib/actorTypes";
import type { ActorDTO } from "@/lib/types";
import type { DragData } from "./DndShell";

export function CardView({ actor }: { actor: ActorDTO }) {
  return (
    <div className="h-full rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex items-start gap-2">
        <span aria-hidden className="text-lg leading-6">
          {typeIcon(actor.type)}
        </span>
        <div className="min-w-0">
          <div className="text-sm font-semibold leading-snug text-slate-900">{actor.name}</div>
          <div className="mt-0.5 text-[11px] text-slate-500">
            {actor.type}
            {actor.affiliation ? ` · ${actor.affiliation}` : ""}
          </div>
        </div>
      </div>
      {actor.currentHolder && <div className="mt-1.5 text-xs text-slate-700">Held by {actor.currentHolder}</div>}
      {actor.description && <p className="mt-1.5 line-clamp-2 text-xs text-slate-600">{actor.description}</p>}
    </div>
  );
}

export function DashboardCard({ actor, onSelect }: { actor: ActorDTO; onSelect: (id: string) => void }) {
  const data: DragData = { actorId: actor.id, from: "dashboard", x: null, y: null };
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: `card-${actor.id}`, data });
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={() => onSelect(actor.id)}
      className={`cursor-grab touch-none select-none ${isDragging ? "opacity-40" : ""}`}
    >
      <CardView actor={actor} />
    </div>
  );
}
