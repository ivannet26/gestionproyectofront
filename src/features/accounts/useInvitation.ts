import { useEffect, useRef, useState } from "react";
import { ApiError, errorText, sessionVersion } from "../auth/api";
import { useToast } from "../../hooks/useToast";
import { inviteAccount } from "../../core/services/accountService";
import type { InvitationData } from "../../core/interfaces/account.interface";

export function useInvitation(onUpdate: () => void | Promise<void>, onClose: () => void) {
  const [busy, setBusy] = useState(false);
  const alive = useRef(true), pending = useRef(false);
  const { addToast } = useToast();
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  async function invite(payload: InvitationData): Promise<boolean> {
    if (!alive.current || pending.current) return false;
    const epoch = sessionVersion(), current = () => alive.current && epoch === sessionVersion();
    pending.current = true; setBusy(true);
    try {
      const result = await inviteAccount(payload);
      if (current()) {
        await onUpdate();
        if (!current()) return false;
        addToast({ icon: "success", title: "Invitación registrada", message: result.detail });
        onClose();
      }
    } catch (failure) {
      if (!current()) return false;
      const persisted = failure instanceof ApiError && failure.status === 503 && Boolean(failure.payload?.account_id);
      if (persisted) await onUpdate();
      if (!current()) return false;
      addToast({ icon: "error", title: "No se pudo registrar", message: errorText(failure) });
      return persisted;
    } finally { pending.current = false; if (current()) setBusy(false); }
    return false;
  }
  return { busy, invite };
}
