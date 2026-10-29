import { useCallback } from "react";
import type { PublicationCreateData, PublicationFilters, PublicationUpdateData } from "../../../core/interfaces/publication.interface";
import { applyToPublication, createPublication, listPublications, updatePublication } from "../../../core/services/publicationService";
import { useRemoteResource } from "../../../hooks/useRemoteResource";

export function usePublications({ search, state, project_id: projectId }: PublicationFilters = {}) {
  const load = useCallback(() => listPublications({ search, state, project_id: projectId }), [search, state, projectId]);
  const resource = useRemoteResource(load, "publications:" + JSON.stringify([search, state, projectId]));
  const create = async (payload: PublicationCreateData) => {
    const created = await createPublication(payload);
    if (resource.isCurrent()) await resource.refetch(true);
    return created;
  };
  const update = async (id: number, payload: PublicationUpdateData) => {
    const updated = await updatePublication(id, payload);
    if (resource.isCurrent()) await resource.refetch(true);
    return updated;
  };
  const apply = async (id: number) => {
    const updated = await applyToPublication(id);
    if (resource.isCurrent()) await resource.refetch(true);
    return updated;
  };
  return { data: resource.value ?? [], loading: resource.pending, error: resource.error, refetch: resource.refetch, create, update, apply };
}
