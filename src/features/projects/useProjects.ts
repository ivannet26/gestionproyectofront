import { useProjectDirectory } from "./useProjectDirectory";
import type { ProjectListFilters } from "./types";

export function useProjects(filters: ProjectListFilters = {}, enabled = true) {
  const directory = useProjectDirectory(filters, enabled);
  return { ...directory, projects: directory.data, refetch: directory.reload };
}
