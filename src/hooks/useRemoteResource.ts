import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { errorText, sessionVersion } from "../features/auth/api";

interface Identity<T> { load: () => Promise<T>; scope: string; epoch: number; enabled: boolean }
interface ResourceState<T> { identity: Identity<T>; value: T | null; error: string; pending: boolean }

export function useRemoteResource<T>(load: () => Promise<T>, scope: string, enabled = true) {
  const [session, setSession] = useState(() => ({ epoch: sessionVersion(), expired: false }));
  const identity = useMemo(() => ({ load, scope, epoch: session.epoch, enabled: enabled && !session.expired }), [load, scope, session, enabled]);
  const [state, setState] = useState<ResourceState<T> | null>(null);
  const active = useRef<Identity<T> | null>(null), sequence = useRef(0);
  const flight = useRef<{ identity: Identity<T>; promise: Promise<void> } | null>(null);
  const isCurrent = useCallback(() => active.current === identity && identity.epoch === sessionVersion(), [identity]);

  const refetch = useCallback((): Promise<void> => {
    if (!isCurrent() || !identity.enabled) return Promise.resolve();
    if (flight.current?.identity === identity) return flight.current.promise;
    const request = ++sequence.current;
    const valid = () => isCurrent() && request === sequence.current;
    setState((previous) => ({
      identity, pending: true, error: "",
      value: previous?.identity.scope === scope && previous.identity.epoch === identity.epoch ? previous.value : null,
    }));
    const operation = Promise.resolve().then(async () => {
      try {
        const value = await load();
        if (valid()) setState({ identity, value, error: "", pending: false });
      } catch (failure) {
        if (valid()) setState((previous) => ({ identity, value: previous?.value ?? null, error: errorText(failure), pending: false }));
      } finally {
        if (flight.current?.promise === operation) flight.current = null;
      }
    });
    flight.current = { identity, promise: operation };
    return operation;
  }, [identity, isCurrent, load, scope]);

  useEffect(() => {
    active.current = identity;
    const version = sequence;
    let mounted = true;
    void Promise.resolve().then(() => { if (mounted) void refetch(); });
    const changed = (event: Event) => {
      const epoch = sessionVersion();
      if (epoch === identity.epoch) return;
      sequence.current++;
      active.current = null;
      flight.current = null;
      setState(null);
      setSession({ epoch, expired: event.type === "gm-session-expired" });
    };
    window.addEventListener("gm-session-expired", changed);
    window.addEventListener("gm-session-updated", changed);
    return () => {
      mounted = false;
      if (active.current === identity) active.current = null;
      version.current++;
      flight.current = null;
      window.removeEventListener("gm-session-expired", changed);
      window.removeEventListener("gm-session-updated", changed);
    };
  }, [identity, refetch]);

  const value = identity.enabled && state?.identity.scope === scope && state.identity.epoch === identity.epoch ? state.value : null;
  const pending = identity.enabled && (state?.identity !== identity || state.pending);
  return {
    value, loading: pending && value === null, refreshing: pending && value !== null, pending,
    ready: value !== null, error: state?.identity === identity ? state.error : "", refetch, isCurrent,
  };
}
