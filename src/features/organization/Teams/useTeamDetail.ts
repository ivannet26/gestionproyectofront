import { useCallback } from "react";
import { getTeamById, listTeamMembers, removeTeamMember } from "../../../core/services/organizationService";
import { useRemoteResource } from "../../../hooks/useRemoteResource";

export function useTeamDetail(teamId: number, includeInactive = false) {
  const enabled = Number.isSafeInteger(teamId) && teamId > 0;
  const detail = useRemoteResource(useCallback(() => getTeamById(teamId), [teamId]), `team:${teamId}`, enabled);
  const people = useRemoteResource(useCallback(() => listTeamMembers(teamId, includeInactive), [teamId, includeInactive]), `team-members:${teamId}`, enabled);
  const refreshDetail = detail.refetch, refreshPeople = people.refetch, isCurrent = people.isCurrent;
  const refetch = useCallback(async () => { await Promise.all([refreshDetail(), refreshPeople()]); }, [refreshDetail, refreshPeople]);
  const removeMember = useCallback(async (memberId: number) => {
    if (!isCurrent()) return;
    await removeTeamMember(teamId, memberId);
    if (isCurrent()) await refreshPeople();
  }, [teamId, isCurrent, refreshPeople]);
  return { team: detail.value, members: people.value ?? [], detail, people, refetch, removeMember, validId: enabled };
}
