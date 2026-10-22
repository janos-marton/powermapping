"use client";

import { useEffect, useRef, useState } from "react";
import type { ChatMessageDTO } from "@/lib/types";

const time = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

export function ChatPanel({
  messages,
  userName,
  claudeFollowUps,
  onToggleFollowUps,
  onSend,
  sending,
  error,
  focusName,
}: {
  messages: ChatMessageDTO[];
  userName: string;
  claudeFollowUps: boolean;
  onToggleFollowUps: (on: boolean) => void;
  onSend: (text: string) => void;
  sending: boolean;
  error: string | null;
  /** Name of the actor whose panel is open; questions are answered with that actor in focus. */
  focusName: string | null;
}) {
  const [draft, setDraft] = useState("");
  const listRef = useRef<HTMLDivElement | null>(null);
  const lastId = messages.at(-1)?.id;

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lastId, sending]);

  function submit(e?: React.FormEvent) {
    e?.preventDefault();
    const text = draft.trim();
    if (!text || sending) return;
    setDraft("");
    onSend(text);
  }

  return (
    <aside
      aria-label="Chat with Claude"
      className="flex h-[30rem] flex-col border-t border-slate-200 bg-white lg:fixed lg:inset-y-0 lg:right-0 lg:z-20 lg:h-auto lg:w-96 lg:border-l lg:border-t-0"
    >
      <div className="border-b border-slate-200 px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-900">Chat with Claude</h2>
        <label className="mt-1 flex cursor-pointer items-center gap-2 text-xs text-slate-600">
          <input
            type="checkbox"
            checked={claudeFollowUps}
            onChange={(e) => onToggleFollowUps(e.target.checked)}
            className="h-3.5 w-3.5"
          />
          Claude asks about my placements
        </label>
      </div>

      <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
        {messages.length === 0 && (
          <p className="text-sm text-slate-500">
            Ask why Claude placed an actor where it did, or what it makes of a placement. Everyone on the team sees this chat.
          </p>
        )}
        {messages.map((m) =>
          m.role === "system_event" ? (
            <p key={m.id} className="text-center text-xs text-slate-500">
              {m.body} <span className="text-slate-400">· {time(m.createdAt)}</span>
            </p>
          ) : m.role === "assistant" ? (
            <div key={m.id} className="max-w-[90%] rounded-lg bg-violet-50 px-3 py-2 text-sm text-slate-800">
              <div className="mb-0.5 text-xs font-medium text-violet-700">Claude · {time(m.createdAt)}</div>
              <p className="whitespace-pre-wrap">{m.body}</p>
            </div>
          ) : (
            <div key={m.id} className={m.userName === userName ? "flex justify-end" : ""}>
              <div
                className={`max-w-[90%] rounded-lg px-3 py-2 text-sm ${
                  m.userName === userName ? "bg-slate-900 text-white" : "border border-slate-200 bg-white text-slate-800"
                }`}
              >
                <div className={`mb-0.5 text-xs font-medium ${m.userName === userName ? "text-slate-300" : "text-slate-500"}`}>
                  {m.userName} · {time(m.createdAt)}
                </div>
                <p className="whitespace-pre-wrap">{m.body}</p>
              </div>
            </div>
          ),
        )}
        {sending && <p className="text-xs italic text-slate-500">Claude is thinking…</p>}
      </div>

      <form onSubmit={submit} className="border-t border-slate-200 p-3">
        {focusName && <p className="mb-1 truncate text-xs text-slate-500">Discussing: {focusName}</p>}
        {error && (
          <p role="alert" className="mb-1 text-xs text-red-600">
            {error}
          </p>
        )}
        <div className="flex items-end gap-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) submit(e);
            }}
            rows={2}
            maxLength={2000}
            placeholder="Ask Claude about the map…"
            aria-label="Message"
            className="flex-1 resize-none rounded-md border border-slate-300 px-2.5 py-1.5 text-sm"
          />
          <button
            disabled={sending || !draft.trim()}
            className="rounded-md bg-violet-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </form>
    </aside>
  );
}
