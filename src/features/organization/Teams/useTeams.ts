import { listTeams } from "../../../core/services/organizationService";
import { useRemoteResource } from "../../../hooks/useRemoteResource";

export const useTeams = () => {
  const resource = useRemoteResource(listTeams, "teams");
  return { ...resource, data: resource.value ?? [] };
};
