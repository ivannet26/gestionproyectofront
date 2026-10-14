import { useCallback, useEffect, useState } from "react";
import {
  getTeamById,
  listTeamMembers,
  removeTeamMember,
} from "../../../core/services/organizationService";
import type {
  Team,
  TeamMember,
} from "../../../core/interfaces/organization.interface";

export function useTeamDetail(teamId: number) {
  const [team, setTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetch = useCallback(async () => {
    if (!Number.isInteger(teamId) || teamId < 1) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [detail, detailMembers] = await Promise.all([
        getTeamById(teamId),
        listTeamMembers(teamId),
      ]);
      setTeam(detail);
      setMembers(detailMembers);
      setError("");
    } catch {
      setError("No se pudo cargar el equipo.");
    } finally {
      setLoading(false);
    }
  }, [teamId]);

  useEffect(() => {
    void fetch();
  }, [fetch]);

  const removeMember = useCallback(
    async (memberId: number) => {
      await removeTeamMember(teamId, memberId);
      await fetch();
    },
    [teamId, fetch],
  );

  return { team, members, loading, error, refetch: fetch, removeMember };
}
