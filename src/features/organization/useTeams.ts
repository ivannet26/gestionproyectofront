import { useEffect, useState } from "react";
import { listTeams } from "../../core/services/organizationService";
import type { Team } from "../../core/interfaces/organization.interface";

export const useTeams = () => {
  const [data, setData] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetch = async () => {
    try {
      setLoading(true);
      const response = await listTeams();
      setData(response);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e : new Error("Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    Promise.resolve().then(fetch);
  }, []);

  return { data, loading, error, refetch: fetch };
};
