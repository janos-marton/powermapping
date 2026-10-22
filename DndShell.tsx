"use client";

import {
  DndContext,
  DragOverlay,
  PointerSensor,
  pointerWithin,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { useState, type ReactNode, type RefObject } from "react";
import { deltaToCoords, pxToCoords } from "@/lib/geometry";
import type { ActorDTO } from "@/lib/types";
import { CardView } from "./ActorCard";
import { ChipView } from "./ActorChip";

export type DragData = { actorId: string; from: "map" | "dashboard"; x: number | null; y: number | null };

export function DndShell({
  actors,
  plotRef,
  onPlace,
  onUnplace,
  onDragActive,
  children,
}: {
  actors: ActorDTO[];
  plotRef: RefObject<HTMLDivElement | null>;
  onPlace: (actorId: string, x: number, y: number) => void;
  onUnplace: (actorId: string) => void;
  /** Called with true on drag start and false on end/cancel, so polling can pause. */
  onDragActive: (active: boolean) => void;
  children: ReactNode;
}) {
  // A small activation distance keeps plain clicks (open panel) separate from drags.
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const [dragging, setDragging] = useState<DragData | null>(null);

  const handleStart = (e: DragStartEvent) => {
    setDragging(e.active.data.current as DragData);
    onDragActive(true);
  };

  const handleEnd = (e: DragEndEvent) => {
    setDragging(null);
    onDragActive(false);
    const d = e.active.data.current as DragData;
    if (!e.over) return;

    if (e.over.id === "dashboard") {
      if (d.from === "map") onUnplace(d.actorId);
      return;
    }
    if (e.over.id !== "map") return;
    const rect = plotRef.current?.getBoundingClientRect();
    if (!rect) return;

    if (d.from === "map" && d.x !== null && d.y !== null) {
      // Moving an existing chip: offset from where it was, so it doesn't jump to the pointer.
      const p = deltaToCoords(d.x, d.y, e.delta.x, e.delta.y, rect.width, rect.height);
      onPlace(d.actorId, p.x, p.y);
    } else {
      // From the dashboard: land under the pointer.
      const ev = e.activatorEvent as PointerEvent;
      const p = pxToCoords(ev.clientX + e.delta.x, ev.clientY + e.delta.y, rect);
      onPlace(d.actorId, p.x, p.y);
    }
  };

  const active = dragging ? actors.find((a) => a.id === dragging.actorId) : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={handleStart}
      onDragEnd={handleEnd}
      onDragCancel={() => {
        setDragging(null);
        onDragActive(false);
      }}
    >
      {children}
      <DragOverlay dropAnimation={null}>
        {active && dragging?.from === "map" && <ChipView actor={active} dragging />}
        {active && dragging?.from === "dashboard" && (
          <div className="opacity-90">
            <CardView actor={active} />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
