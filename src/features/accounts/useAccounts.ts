import { useCallback, useEffect, useRef, useState } from "react";
import { errorText, sessionVersion } from "../auth/api";
import { useToast } from "../../hooks/useToast";
import { useCursorPage } from "../../hooks/useCursorPage";
import { useRemoteResource } from "../../hooks/useRemoteResource";
import { listAccounts, listAccountAreas, resendAccountInvitation } from "../../core/services/accountService";
import type { AccountFilters } from "../../core/interfaces/account.interface";
export type { AccountFilters } from "../../core/interfaces/account.interface";

export function useAccounts(filters: AccountFilters = {}) {
  const { search = "", active } = filters;
  const list = useCursorPage(useCallback((cursor: string | null) => listAccounts({ search, active }, cursor), [search, active]),
    "accounts:" + JSON.stringify([search, active]));
  const areaResource = useRemoteResource(listAccountAreas, "account-areas");
  const [busy, setBusy] = useState(false), [mutationError, setMutationError] = useState("");
  const alive = useRef(true), pending = useRef(false);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const { addToast } = useToast();
  async function resendInvitation(id: number) {
    if (pending.current || !list.isCurrent()) return;
    const epoch = sessionVersion(), current = () => alive.current && epoch === sessionVersion();
    pending.current = true; setBusy(true); setMutationError("");
    try {
      const result = await resendAccountInvitation(id);
      if (current()) {
        addToast({ icon: "success", title: "Invitación reenviada", message: result.detail });
        await list.reload();
      }
    } catch (failure) { if (current()) setMutationError(errorText(failure)); }
    finally { pending.current = false; if (current()) setBusy(false); }
  }
  return { ...list, accounts: list.data, areas: areaResource.value ?? [], areaResource, busy, mutationError, resendInvitation, reload: list.reload };
}
