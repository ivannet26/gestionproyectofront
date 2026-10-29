import { useCallback } from "react";
import { useRemoteResource } from "../../../hooks/useRemoteResource";
import { getProjectAssignmentTeams } from "../services";
import type { TeamOption } from "../types";

export function useAssignmentTeams(projectId: number, enabled: boolean, initial?: TeamOption[]) {
  const load = useCallback(() => getProjectAssignmentTeams(projectId), [projectId]);
  const resource = useRemoteResource(load, `assignment-teams:${projectId}`, enabled && initial === undefined);
  return { teams: initial ?? resource.value ?? [], error: resource.error, loading: resource.loading, retry: resource.refetch };
}
