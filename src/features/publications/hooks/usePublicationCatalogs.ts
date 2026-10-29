import { useRemoteResource } from "../../../hooks/useRemoteResource";
import { getPublicationCatalogs } from "../../../core/services/publicationService";

export function usePublicationCatalogs(enabled: boolean) {
  const resource = useRemoteResource(getPublicationCatalogs, "publication-catalogs", enabled);
  return { data: resource.value, loading: resource.pending, error: resource.error, retry: resource.refetch };
}
