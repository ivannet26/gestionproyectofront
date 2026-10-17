import { useCallback, useEffect, useMemo, useState } from "react";
import {
  apiRequest,
  errorText,
  type DetailResult,
  type RecoveryRequest,
} from "../auth/api";
import { useToast } from "../../hooks/useToast";

export interface RecoveryRequestFilters {
  search?: string;
}

export function useRecoveryRequests(filters: RecoveryRequestFilters = {}) {
  const { search = "" } = filters;
  const [requests, setRequests] = useState<RecoveryRequest[]>([]);
  const [busy, setBusy] = useState(false);
  const { addToast } = useToast();

  const load = useCallback(async () => {
    try {
      setRequests(
        await apiRequest<RecoveryRequest[]>("admin/recovery-requests/"),
      );
    } catch (failure) {
      addToast({
        icon: "error",
        title: "Error al cargar",
        message: errorText(failure),
      });
    }
  }, [addToast]);

  useEffect(() => {
    Promise.resolve().then(load);
  }, [load]);

  const visibleRequests = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return requests;
    return requests.filter(
      (entry) =>
        entry.name.toLowerCase().includes(term) ||
        entry.email.toLowerCase().includes(term),
    );
  }, [requests, search]);

  const issueReset = async (requestId: number) => {
    setBusy(true);
    try {
      const result = await apiRequest<DetailResult>(
        `admin/recovery-requests/${requestId}/issue/`,
        { method: "POST" },
      );
      addToast({
        icon: "success",
        title: "Enlace de recuperación enviado",
        message: result.detail,
      });
    } catch (failure) {
      addToast({
        icon: "error",
        title: "No se pudo emitir el enlace",
        message: errorText(failure),
      });
    } finally {
      await load();
      setBusy(false);
    }
  };

  return { requests: visibleRequests, busy, issueReset };
}
