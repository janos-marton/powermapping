"use client";

import { useState } from "react";
import { NoteInput } from "./NoteInput";

export type Nudge = { actorId: string; previousBy: string };

/** Shown after you move an actor someone else (a colleague or Claude) last placed. Dismissible. */
export function MoveNudgeToast({ nudge, onDismiss }: { nudge: Nudge; onDismiss: () => void }) {
  const [posted, setPosted] = useState(false);

  return (
    <div role="status" className="fixed bottom-4 left-1/2 z-40 w-80 -translate-x-1/2 rounded-lg border border-amber-300 bg-amber-50 p-3 shadow-lg">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm text-amber-900">
          {posted ? "Note added. Thanks!" : `Previously placed by ${nudge.previousBy}. Add a note on why you moved it?`}
        </p>
        <button onClick={onDismiss} aria-label="Dismiss" className="text-amber-700 hover:text-amber-900">
          ✕
        </button>
      </div>
      {!posted && (
        <div className="mt-2">
          <NoteInput
            actorId={nudge.actorId}
            autoFocus
            placeholder="Why did you move it?"
            onPosted={() => {
              setPosted(true);
              setTimeout(onDismiss, 1500);
            }}
          />
        </div>
      )}
    </div>
  );
}
