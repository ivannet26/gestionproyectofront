import { useProjectAreaDirectory } from "../../projects/useProjectAreaDirectory";

export function useOrganizationProjects() {
  return useProjectAreaDirectory(undefined, true);
}
