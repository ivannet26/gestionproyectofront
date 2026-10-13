import { useEffect, useState } from "react";
import { listSpecialties } from "../../core/services/organizationService";
import type { Specialty } from "../../core/interfaces/organization.interface";

export const useSpecialties = () => {
  const [data, setData] = useState<Specialty[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetch = async () => {
    try {
      setLoading(true);
      const response = await listSpecialties();
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
