import { httpClient } from "../api/httpClient";
import type { AccountFilters, RecoveryRequestFilters, InvitationData } from "../interfaces/account.interface";
import type { CursorPage } from "../interfaces/pagination.interface";
import type { Account, Area, DetailResult, RecoveryRequest } from "../../features/auth/api";

function queryString(filters: AccountFilters, cursor: string | null) {
  const query = new URLSearchParams();
  if (filters.search?.trim()) query.set("search", filters.search.trim());
  if (filters.active !== undefined) query.set("active", String(filters.active));
  if (cursor) query.set("cursor", cursor);
  return query.size ? "?" + query : "";
}

export async function listAccounts(filters: AccountFilters = {}, cursor: string | null = null): Promise<CursorPage<Account>> {
  const { data } = await httpClient.get<CursorPage<Account>>("auth/admin/accounts/" + queryString(filters, cursor));
  return data;
}

export async function listRecoveryRequests(filters: RecoveryRequestFilters = {}, cursor: string | null = null): Promise<CursorPage<RecoveryRequest>> {
  const { data } = await httpClient.get<CursorPage<RecoveryRequest>>("auth/admin/recovery-requests/" + queryString(filters, cursor));
  return data;
}

export async function listAccountAreas(): Promise<Area[]> {
  const { data } = await httpClient.get<Area[]>("auth/admin/areas/");
  return data;
}

export async function inviteAccount(payload: InvitationData): Promise<DetailResult> {
  const { data } = await httpClient.post<DetailResult>("auth/admin/invitations/", payload);
  return data;
}

export async function resendAccountInvitation(id: number): Promise<DetailResult> {
  const { data } = await httpClient.post<DetailResult>(`auth/admin/accounts/${id}/resend-invitation/`, {});
  return data;
}

export async function issueAccountReset(id: number): Promise<DetailResult> {
  const { data } = await httpClient.post<DetailResult>(`auth/admin/recovery-requests/${id}/issue/`, {});
  return data;
}
