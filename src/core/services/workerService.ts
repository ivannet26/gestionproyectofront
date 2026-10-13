import { httpClient } from "../../core/api/httpClient";
import type { Worker, WorkerUpdateData } from "../interfaces/worker.interface";

export async function listWorkers(): Promise<Worker[]> {
  const { data } = await httpClient.get<Worker[]>("workers/");
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
