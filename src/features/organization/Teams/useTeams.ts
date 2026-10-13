import { useEffect, useState } from "react";
import { listTeams } from "../../../core/services/organizationService";
import type { Team } from "../../../core/interfaces/organization.interface";

export const useTeams = () => {
  const [data, setData] = useState<Team[]>([]);

  const fetch = async () => {
    try {
      const response = await listTeams();
      setData(response);
    } catch {
      // los componentes tsx no usan loading/error: se mantiene la lista vacía
    }
  };

  useEffect(() => {
    Promise.resolve().then(fetch);
  }, []);

  return { data, refetch: fetch };
};
