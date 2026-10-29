import { useCallback, useMemo } from "react";
import { getProjectAreas, getProjects } from "./services";
import { mergeProjectItems } from "./projectStream";
import { useProjectStream } from "./useProjectStream";

export function useProjectAreaDirectory(associated: boolean | undefined, enabled: boolean, currentPath = "") {
  const load = useCallback((cursor: string | null, signal: AbortSignal) => getProjectAreas({ associated }, cursor, signal), [associated]);
  const resource = useProjectStream(load, enabled);
  const activeId = Number(currentPath.match(/^\/proyectos\/(\d+)$/)?.[1]);
  const loadCurrent = useCallback((cursor: string | null, signal: AbortSignal) => getProjects({ project_id: activeId, associated }, cursor, signal), [activeId, associated]);
  const current = useProjectStream(loadCurrent, enabled && Number.isSafeInteger(activeId) && activeId > 0);
  const currentProject = current.data[0] ?? null;
  const area = currentProject?.areas[0];
  const areas = useMemo(() => area && !resource.data.some((item) => item.id === area.id) ? mergeProjectItems(resource.data, [area]) : resource.data, [area, resource.data]);
  return { ...resource, areas, currentProject, currentError: current.error, retryCurrent: current.retry };
}

export function useProjectAreaProjects(areaId: number, associated: boolean | undefined, enabled: boolean) {
  const load = useCallback((cursor: string | null, signal: AbortSignal) => getProjects({ area_id: areaId, associated }, cursor, signal), [areaId, associated]);
  return useProjectStream(load, enabled, areaId);
}
