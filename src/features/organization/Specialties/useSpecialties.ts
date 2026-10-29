import { listSpecialties } from "../../../core/services/organizationService";
import { useRemoteResource } from "../../../hooks/useRemoteResource";

export const useSpecialties = () => {
  const resource = useRemoteResource(listSpecialties, "specialties");
  return { ...resource, data: resource.value ?? [] };
};
