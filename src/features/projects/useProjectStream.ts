import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import type { CursorPage } from "../../core/interfaces/pagination.interface";
import { sessionVersion } from "../auth/api";
import { createProjectStream } from "./projectStream";
import { projectDirectoryEvent } from "./projectDirectoryEvents";

export function useProjectStream<T extends { id: number }>(load: (cursor: string | null, signal: AbortSignal) => Promise<CursorPage<T>>, enabled: boolean, areaId?: number) {
  const [session, setSession] = useState(() => ({ epoch: sessionVersion(), expired: false }));
  const stream = useMemo(() => createProjectStream(load, session.epoch), [load, session.epoch]);
  const state = useSyncExternalStore(stream.subscribe, stream.getSnapshot, stream.getSnapshot);
  useEffect(() => {
    let mounted = true;
    void Promise.resolve().then(() => { if (mounted && enabled && !session.expired) stream.resume(); });
    return () => { mounted = false; stream.pause(); };
  }, [stream, enabled, session.expired]);
  useEffect(() => {
    function changed(event: Event) {
      if (sessionVersion() === session.epoch) return;
      stream.dispose(); setSession({ epoch: sessionVersion(), expired: event.type === "gm-session-expired" });
    }
    function updated(event: Event) {
      const ids: unknown = (event as CustomEvent<{ areaIds: number[] }>).detail?.areaIds;
      if (Array.isArray(ids) && (areaId === undefined || ids.includes(areaId))) stream.invalidate();
    }
    window.addEventListener("gm-session-expired", changed);
    window.addEventListener("gm-session-updated", changed);
    window.addEventListener(projectDirectoryEvent, updated);
    return () => {
      window.removeEventListener("gm-session-expired", changed);
      window.removeEventListener("gm-session-updated", changed);
      window.removeEventListener(projectDirectoryEvent, updated);
    };
  }, [stream, session.epoch, areaId]);
  return { ...state, more: stream.more, retry: stream.retry };
}
