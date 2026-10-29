import type { CursorPage } from "../../core/interfaces/pagination.interface";
import { errorText, sessionVersion } from "../auth/api";

export function mergeProjectItems<T extends { id: number }>(previous: T[], incoming: T[]) {
  return [...new Map([...previous, ...incoming].map((item) => [item.id, item])).values()].sort((a, b) => b.id - a.id);
}

export function createProjectStream<T extends { id: number }>(load: (cursor: string | null, signal: AbortSignal) => Promise<CursorPage<T>>, epoch: number) {
  let state = { data: [] as T[], ready: false, pending: false, error: "", hasMore: false };
  let enabled = false, disposed = false, generation = 0, pages = 0, next: string | null = null, stale = false;
  let failed: "refresh" | "more" = "refresh";
  let flight: { abort: AbortController; promise: Promise<void> } | null = null;
  const listeners = new Set<() => void>();
  const isCurrent = () => !disposed && epoch === sessionVersion();
  const publish = (patch: Partial<typeof state>) => { state = { ...state, ...patch }; for (const listener of listeners) listener(); };
  function cancel() { generation++; flight?.abort.abort(); flight = null; }
  function run(kind: "refresh" | "more", invalidate = false): Promise<void> {
    if (!isCurrent() || !enabled || kind === "more" && (!state.hasMore || state.error)) return Promise.resolve();
    if (flight && !invalidate) return flight.promise;
    if (invalidate) cancel();
    const ticket = ++generation, abort = new AbortController();
    const valid = () => isCurrent() && enabled && ticket === generation;
    failed = kind;
    publish({ pending: true, error: "" });
    const operation = Promise.resolve().then(async () => {
      try {
        if (!valid()) return;
        let cursor = kind === "refresh" ? null : next, fresh: T[] = [], count = 0;
        const limit = kind === "refresh" ? Math.max(1, pages) : 1;
        do {
          const page = await load(cursor, abort.signal);
          if (!valid()) return;
          if (page.next_cursor !== null && page.next_cursor === cursor) throw new Error("No se pudo continuar el listado de proyectos. Reintenta la carga.");
          fresh = mergeProjectItems(fresh, page.results);
          cursor = page.next_cursor; count++;
        } while (count < limit && cursor !== null);
        if (!valid()) return;
        pages = kind === "refresh" ? count : pages + count;
        next = cursor; stale = false;
        publish({ data: kind === "refresh" ? fresh : mergeProjectItems(state.data, fresh), ready: true, pending: false, error: "", hasMore: next !== null });
      } catch (failure) {
        if (valid()) publish({ pending: false, error: errorText(failure) });
      } finally { if (flight?.promise === operation) flight = null; }
    });
    flight = { abort, promise: operation };
    return operation;
  }
  return {
    getSnapshot: () => state,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    isCurrent,
    resume() { if (!isCurrent()) return; enabled = true; if (!state.ready || stale) void run("refresh"); },
    pause() { enabled = false; if (flight && failed === "refresh") stale = true; cancel(); if (state.pending) publish({ pending: false }); },
    dispose() { disposed = true; enabled = false; cancel(); publish({ data: [], ready: false, pending: false, error: "", hasMore: false }); },
    more: () => run("more"),
    retry() { if (!state.error) return Promise.resolve(); publish({ error: "" }); return run(failed); },
    invalidate() { if (!isCurrent()) return; stale = true; if (enabled) void run("refresh", true); },
  };
}
