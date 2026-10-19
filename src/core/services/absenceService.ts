import { httpClient } from "../../core/api/httpClient";
import type {
  Absence,
  AbsenceCreateData,
  AbsenceFilters,
  AbsenceReviewData,
} from "../interfaces/absence.interface";

export async function listAbsences(
  filters?: AbsenceFilters,
): Promise<Absence[]> {
  const params = new URLSearchParams();
  if (filters?.status) params.set("status", filters.status);
  const search = filters?.search?.trim();
  if (search) params.set("search", search);
  const query = params.toString();
  const { data } = await httpClient.get<Absence[]>(
    query ? `absences/?${query}` : "absences/",
  );
  return data;
}

export async function reviewAbsence(
  id: number,
  payload: AbsenceReviewData,
): Promise<Absence> {
  const { data } = await httpClient.patch<Absence>(
    `absences/${id}/review/`,
    payload,
  );
  return data;
}

export async function createAbsence(
  payload: AbsenceCreateData,
): Promise<Absence> {
  const { data } = await httpClient.post<Absence>("absences/", payload);
  return data;
}
