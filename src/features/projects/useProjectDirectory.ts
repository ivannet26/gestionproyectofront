import { useCallback } from "react";
import { useCursorPage } from "../../hooks/useCursorPage";
import { getProjects } from "./services";
import type { ProjectListFilters } from "./types";

export function useProjectDirectory(filters: ProjectListFilters = {}, enabled = true) {
  const { search = "", area_id, state_code, available, associated } = filters;
  const load = useCallback((cursor: string | null) => getProjects({ search, area_id, state_code, available, associated }, cursor),
    [search, area_id, state_code, available, associated]);
  return useCursorPage(load, "projects:" + JSON.stringify([search, area_id, state_code, available, associated]), enabled);
}
