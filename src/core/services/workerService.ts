import { httpClient } from "../../core/api/httpClient";
import type {
  MySpecialty,
  MySpecialtyWriteData,
  Worker,
  WorkerFilters,
  WorkerUpdateData,
} from "../interfaces/worker.interface";

export async function listWorkers(filters?: WorkerFilters): Promise<Worker[]> {
  const params = new URLSearchParams();
  const search = filters?.search?.trim();
  if (search) params.set("search", search);
  if (filters?.disponible !== undefined)
    params.set("disponible", String(filters.disponible));
  const query = params.toString();
  const { data } = await httpClient.get<Worker[]>(
    query ? `workers/?${query}` : "workers/",
  );
  return data;
}
export async function getWorkerById(id: number): Promise<Worker> {
  const { data } = await httpClient.get<Worker>(`workers/${id}/`);
  return data;
}

export async function updateWorker(
  id: number,
  payload: WorkerUpdateData,
): Promise<Worker> {
  const { data } = await httpClient.put<Worker>(`workers/${id}/`, payload);
  return data;
}

export async function listMySpecialties(): Promise<MySpecialty[]> {
  const { data } = await httpClient.get<MySpecialty[]>(
    "workers/me/specialties/",
  );
  return data;
}

export async function addMySpecialty(
  payload: MySpecialtyWriteData,
): Promise<MySpecialty> {
  const { data } = await httpClient.post<MySpecialty>(
    "workers/me/specialties/",
    payload,
  );
  return data;
}

export async function removeMySpecialty(specialtyId: number): Promise<void> {
  await httpClient.delete("workers/me/specialties/", {
    data: { specialty_id: specialtyId },
  });
}
