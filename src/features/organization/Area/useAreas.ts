import { listAreas } from "../../../core/services/organizationService";
import { useRemoteResource } from "../../../hooks/useRemoteResource";

export const useAreas = (enabled = true) => {
  const resource = useRemoteResource(listAreas, "areas", enabled);
  return { ...resource, data: resource.value ?? [] };
};
