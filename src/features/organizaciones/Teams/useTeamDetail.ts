import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getTeamById,
  listTeamMembers,
  removeTeamMember,
} from "../../../core/services/organizationService";
import type { Team, TeamMember } from "../../../core/interfaces/organization.interface";

export function useTeamDetail(teamId: number) {
  const queryClient = useQueryClient();
  const enabled = Number.isInteger(teamId) && teamId > 0;

  const teamQuery = useQuery<Team>({
    queryKey: ["team", teamId],
    queryFn: () => getTeamById(teamId),
    enabled,
  });

  const membersQuery = useQuery<TeamMember[]>({
    queryKey: ["teamMembers", teamId],
    queryFn: () => listTeamMembers(teamId),
    enabled,
  });

  const removeMutation = useMutation({
    mutationFn: (memberId: number) => removeTeamMember(teamId, memberId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["teamMembers", teamId],
      });
      await queryClient.invalidateQueries({ queryKey: ["teams"] });
    },
  });

  const refetch = async () => {
    await Promise.all([teamQuery.refetch(), membersQuery.refetch()]);
  };

  return {
    team: teamQuery.data ?? null,
    members: membersQuery.data ?? [],
    removing: removeMutation.isPending,
    refetch,
    removeMember: removeMutation.mutateAsync,
  };
}
