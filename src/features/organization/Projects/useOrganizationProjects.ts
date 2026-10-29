import { useProjectDirectory } from "../../projects/useProjectDirectory";

export function useOrganizationProjects(search = "") {
  return useProjectDirectory({ search });
}
