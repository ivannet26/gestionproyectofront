import { useCallback, useEffect, useMemo, useState } from "react";
import {
  apiRequest,
  errorText,
  type Account,
  type Area,
  type DetailResult,
} from "../auth/api";
import { useToast } from "../../hooks/useToast";

export interface AccountFilters {
  search?: string;
  active?: boolean;
}

export function useAccounts(filters: AccountFilters = {}) {
  const { search = "", active } = filters;
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [busy, setBusy] = useState(false);
  const { addToast } = useToast();

  const load = useCallback(async () => {
    try {
      const [accountList, areaList] = await Promise.all([
        apiRequest<Account[]>("admin/accounts/"),
        apiRequest<Area[]>("admin/areas/"),
      ]);
      setAccounts(accountList);
      setAreas(areaList);
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

  const visibleAccounts = useMemo(() => {
    const term = search.trim().toLowerCase();
    return accounts.filter((account) => {
      if (active !== undefined && account.active !== active) return false;
      if (!term) return true;
      return (
        account.name.toLowerCase().includes(term) ||
        account.email.toLowerCase().includes(term)
      );
    });
  }, [accounts, search, active]);

  const resendInvitation = async (accountId: number) => {
    setBusy(true);
    try {
      const result = await apiRequest<DetailResult>(
        `admin/accounts/${accountId}/resend-invitation/`,
        { method: "POST" },
      );
      addToast({
        icon: "success",
        title: "Invitación reenviada",
        message: result.detail,
      });
    } catch (failure) {
      addToast({
        icon: "error",
        title: "No se pudo reenviar",
        message: errorText(failure),
      });
    } finally {
      await load();
      setBusy(false);
    }
  };

  return {
    accounts: visibleAccounts,
    areas,
    busy,
    resendInvitation,
    reload: load,
  };
}
