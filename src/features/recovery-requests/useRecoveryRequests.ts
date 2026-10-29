import { useCallback, useEffect, useRef, useState } from "react";
import { errorText, sessionVersion } from "../auth/api";
import { useToast } from "../../hooks/useToast";
import { useCursorPage } from "../../hooks/useCursorPage";
import { listRecoveryRequests, issueAccountReset } from "../../core/services/accountService";
import type { RecoveryRequestFilters } from "../../core/interfaces/account.interface";
export type { RecoveryRequestFilters } from "../../core/interfaces/account.interface";

export function useRecoveryRequests(filters: RecoveryRequestFilters = {}) {
  const { search = "" } = filters;
  const list = useCursorPage(useCallback((cursor: string | null) => listRecoveryRequests({ search }, cursor), [search]), "recoveries:" + search);
  const [busy, setBusy] = useState(false), [mutationError, setMutationError] = useState("");
  const alive = useRef(true), pending = useRef(false);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const { addToast } = useToast();
  async function issueReset(id: number) {
    if (pending.current || !list.isCurrent()) return;
    const epoch = sessionVersion(), current = () => alive.current && epoch === sessionVersion();
    pending.current = true; setBusy(true); setMutationError("");
    try {
      const result = await issueAccountReset(id);
      if (current()) {
        addToast({ icon: "success", title: "Enlace de recuperación enviado", message: result.detail });
        await list.reload();
      }
    } catch (failure) { if (current()) setMutationError(errorText(failure)); }
    finally { pending.current = false; if (current()) setBusy(false); }
  }
  return { ...list, requests: list.data, busy, mutationError, issueReset };
}
