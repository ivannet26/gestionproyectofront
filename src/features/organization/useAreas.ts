import { useEffect, useState } from "react";
import { listAreas } from "../../core/services/organizationService";
import type { Area } from "../../core/interfaces/organization.interface";

export const useAreas = () => {
  const [data, setData] = useState<Area[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetch = async () => {
    try {
      setLoading(true);
      const response = await listAreas();
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
