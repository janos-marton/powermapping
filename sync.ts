"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { MapState } from "./types";

const POLL_MS = 5000;

/**
 * Client sync layer. Currently polls /api/state; to move to server-sent events, replace the
 * interval below with an EventSource that calls the same `apply` and keep the returned shape.
 * `hold()` suspends applying server state (during a drag or an in-flight write) so optimistic
 * UI isn't overwritten by a stale poll; it returns a release function.
 */
export function useMapSync(enabled: boolean) {
  const [state, setState] = useState<MapState | null>(null);
  const [unauthorized, setUnauthorized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const holds = useRef(0);

  const refresh = useCallback(async () => {
    if (holds.current > 0) return;
    try {
      const res = await fetch("/api/state", { cache: "no-store" });
      if (res.status === 401) return setUnauthorized(true);
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? `HTTP ${res.status}`);
      const next: MapState = await res.json();
      if (holds.current > 0) return; // a write started while we were fetching
      setUnauthorized(false);
      setError(null);
      setState(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sync failed");
    }
  }, []);

  const hold = useCallback(() => {
    holds.current++;
    let released = false;
    return () => {
      if (!released) {
        released = true;
        holds.current--;
      }
    };
  }, []);

  useEffect(() => {
    if (!enabled) return;
    refresh();
    const id = setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, POLL_MS);
    const onVisible = () => document.visibilityState === "visible" && refresh();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [enabled, refresh]);

  return { state, setState, refresh, hold, unauthorized, error };
}
