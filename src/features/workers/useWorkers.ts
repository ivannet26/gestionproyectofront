import { useCallback } from "react";
import { listWorkers } from "../../core/services/workerService";
import type { WorkerFilters } from "../../core/interfaces/worker.interface";
import { useRemoteResource } from "../../hooks/useRemoteResource";

export const useWorkers = (filters: WorkerFilters = {}) => {
  const { search, disponible, area_id, active } = filters;
  const load = useCallback(() => listWorkers({ search, disponible, area_id, active }), [search, disponible, area_id, active]);
  const resource = useRemoteResource(load, "workers");
  return { ...resource, data: resource.value ?? [] };
};
