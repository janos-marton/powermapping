"use client";

import { useDraggable } from "@dnd-kit/core";
import { shortName, typeIcon } from "@/lib/actorTypes";
import { coordsToPercent } from "@/lib/geometry";
import type { ActorDTO } from "@/lib/types";
import { PlacerBadge } from "./PlacerBadge";
import type { DragData } from "./DndShell";

export function ChipView({ actor, dragging }: { actor: ActorDTO; dragging?: boolean }) {
  return (
    <div
      title={actor.name}
      className={`flex max-w-[10rem] items-center gap-1 rounded-full border border-slate-300 bg-white px-2 py-1 text-[11px] leading-tight shadow-sm ${
        dragging ? "shadow-lg ring-2 ring-sky-400" : ""
      }`}
    >
      <span aria-hidden>{typeIcon(actor.type)}</span>
      <span className="line-clamp-2 font-medium text-slate-800">{shortName(actor.name)}</span>
      <PlacerBadge actor={actor} />
    </div>
  );
}

export function MapChip({ actor, onSelect }: { actor: ActorDTO; onSelect: (id: string) => void }) {
  const data: DragData = { actorId: actor.id, from: "map", x: actor.x, y: actor.y };
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: `map-${actor.id}`, data });
  const pos = coordsToPercent(actor.x as number, actor.y as number);
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={() => onSelect(actor.id)}
      style={{ left: `${pos.left}%`, top: `${pos.top}%` }}
      className={`absolute z-10 -translate-x-1/2 -translate-y-1/2 cursor-grab touch-none select-none hover:z-20 ${
        isDragging ? "opacity-30" : ""
      }`}
    >
      <ChipView actor={actor} />
    </div>
  );
}
